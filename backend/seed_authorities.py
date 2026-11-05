"""
Seed municipal authority divisions + authority login accounts into a
RoadLens production database (Atlas).

Production runs with ALLOW_DEMO_DATA=false, so neither the divisions nor the
authority users exist at startup. This script:
  1. Upserts the 4 Ballari (Karnataka) municipal divisions (idempotent - never overwrites
     existing documents, safe to re-run).
  2. Creates one AUTHORITY login per division with a STRONG RANDOM password
     (printed once at the end - save it). Emails/passwords can be overridden
     via AUTH_EMAILS / AUTH_PASSWORDS env vars (comma-separated, same order).

Usage:
    cd backend
    python seed_authorities.py
"""
import getpass
import os
import secrets
import sys
import uuid
from datetime import datetime, timezone

from passlib.context import CryptContext
from pymongo import MongoClient

DB_NAME = "roadlens_db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Same division ids as the app's demo/locality-matching logic expects
# (find_matching_authority matches complaint locations against coverage_area).
DIVISIONS = [
    {
        "id": "auth-downtown",
        "code": "AUTH-CENTRAL",
        "name": "Central Ballari Roads & Works Division",
        "zone": "Central Ballari",
        "coverage_area": "Gandhi Nagar, Cowl Bazaar, Brucepeta, Court Circle",
        "contact_email": "central.roads@roadlens.gov.in",
        "contact_phone": "+91 8392 223456",
        "hq_latitude": 15.1394,
        "hq_longitude": 76.9214,
        "active_complaints_count": 0,
        "resolved_count": 0,
    },
    {
        "id": "auth-north",
        "code": "AUTH-NORTH",
        "name": "North Ballari Municipal Highways",
        "zone": "North Ballari",
        "coverage_area": "Kudithini, Moka, Hospet Rd, NH-50 Corridor",
        "contact_email": "north.highways@roadlens.gov.in",
        "contact_phone": "+91 8392 234567",
        "hq_latitude": 15.2050,
        "hq_longitude": 76.8930,
        "active_complaints_count": 0,
        "resolved_count": 0,
    },
    {
        "id": "auth-south",
        "code": "AUTH-SOUTH",
        "name": "South Ballari Infrastructure Corp",
        "zone": "South Ballari & Industrial Belt",
        "coverage_area": "Kappagal, Allipuram, BSS Hill, Industrial Estate",
        "contact_email": "south.infra@roadlens.gov.in",
        "contact_phone": "+91 8392 245678",
        "hq_latitude": 15.1050,
        "hq_longitude": 76.9100,
        "active_complaints_count": 0,
        "resolved_count": 0,
    },
    {
        "id": "auth-suburban",
        "code": "AUTH-EAST",
        "name": "East Ballari Public Works",
        "zone": "East Ballari & Tech Corridor",
        "coverage_area": "Siruguppa Rd, Vaddaragatti, Bukkasagara, Moka Rd",
        "contact_email": "east.publicworks@roadlens.gov.in",
        "contact_phone": "+91 8392 256789",
        "hq_latitude": 15.1600,
        "hq_longitude": 76.9800,
        "active_complaints_count": 0,
        "resolved_count": 0,
    },
]


def main() -> None:
    print("=== RoadLens authority seeding ===")
    mongo_url = os.getenv("MONGO_URL", "").strip()
    if not mongo_url:
        mongo_url = getpass.getpass("MONGO_URL (Atlas connection string, hidden): ").strip()
    if not mongo_url:
        print("Error: MONGO_URL is required.")
        sys.exit(1)

    client = MongoClient(mongo_url, serverSelectionTimeoutMS=15000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"Error: could not reach MongoDB - {e}")
        sys.exit(1)

    db = client[DB_NAME]
    now = datetime.now(timezone.utc).isoformat()

    # 1. Municipal divisions (upsert, $setOnInsert = idempotent)
    for division in DIVISIONS:
        doc = {**division, "created_at": now}
        result = db.authorities.update_one({"id": doc["id"]}, {"$setOnInsert": doc}, upsert=True)
        status = "created" if result.upserted_id else "already exists"
        print(f"division  {doc['id']}: {status}")
        # Backfill HQ coordinates on divisions created before geo-routing existed
        db.authorities.update_one(
            {"id": doc["id"], "hq_latitude": {"$exists": False}},
            {"$set": {"hq_latitude": division["hq_latitude"], "hq_longitude": division["hq_longitude"]}}
        )

    # 2. One authority login per division
    emails = [e.strip().lower() for e in os.getenv("AUTH_EMAILS", "").split(",") if e.strip()]
    passwords = [p.strip() for p in os.getenv("AUTH_PASSWORDS", "").split(",") if p.strip()]
    created = []
    for i, division in enumerate(DIVISIONS):
        email = emails[i] if i < len(emails) else division["contact_email"]
        if db.users.find_one({"username": email}):
            print(f"SKIP      {email}  (user already exists)")
            continue
        password = passwords[i] if i < len(passwords) else secrets.token_urlsafe(12)
        engineer_name = f"{division['zone']} Field Engineer"
        db.users.insert_one({
            "id": str(uuid.uuid4()),
            "username": email,
            "email": email,
            "password_hash": pwd_context.hash(password),
            "full_name": f"{engineer_name} ({division['name']})",
            "name": engineer_name,
            "phone": division["contact_phone"],
            "role": "AUTHORITY",
            "status": "ACTIVE",
            "auth_provider": "password",
            "authority_id": division["id"],
            "authority_name": division["name"],
            "disabled": False,
            "created_at": now,
        })
        created.append((email, division["name"], password))

    print("\n=== AUTHORITY LOGINS (save these now, they are not stored in plaintext) ===")
    for email, division_name, password in created:
        print(f"  {email}  |  {password}   ({division_name})")
    if not created:
        print("  (no new accounts created)")
    print("\nAuthority users see only their division's complaints and handle the")
    print("ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED repair workflow.")


if __name__ == "__main__":
    main()
