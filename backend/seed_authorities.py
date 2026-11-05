"""
Seed municipal authority divisions + authority login accounts into a
RoadLens production database (Atlas).

Production runs with ALLOW_DEMO_DATA=false, so neither the divisions nor the
authority users exist at startup. This script:
  1. Upserts the 4 Bengaluru municipal divisions (idempotent - never overwrites
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
        "name": "Central Bengaluru Roads & Works Division",
        "zone": "Central Bengaluru",
        "coverage_area": "MG Road, Residency Rd, Shivajinagar, Trinity Circle",
        "contact_email": "central.roads@roadlens.gov.in",
        "contact_phone": "+91 80 2234 5678",
        "hq_latitude": 12.9756,
        "hq_longitude": 77.6068,
        "active_complaints_count": 0,
        "resolved_count": 0,
    },
    {
        "id": "auth-north",
        "code": "AUTH-NORTH",
        "name": "North Bengaluru Municipal Highways",
        "zone": "North Bengaluru",
        "coverage_area": "Hebbal, Yelahanka, BEL Road, Airport Corridor (NH-44)",
        "contact_email": "north.highways@roadlens.gov.in",
        "contact_phone": "+91 80 2345 6789",
        "hq_latitude": 13.0358,
        "hq_longitude": 77.5970,
        "active_complaints_count": 0,
        "resolved_count": 0,
    },
    {
        "id": "auth-south",
        "code": "AUTH-SOUTH",
        "name": "South Bengaluru Infrastructure Corp",
        "zone": "South Bengaluru & Industrial Belt",
        "coverage_area": "Jayanagar, BTM Layout, Bommasandra, Electronic City",
        "contact_email": "south.infra@roadlens.gov.in",
        "contact_phone": "+91 80 2456 7890",
        "hq_latitude": 12.9250,
        "hq_longitude": 77.5930,
        "active_complaints_count": 0,
        "resolved_count": 0,
    },
    {
        "id": "auth-suburban",
        "code": "AUTH-EAST",
        "name": "East Bengaluru Public Works",
        "zone": "East Bengaluru & Tech Corridor",
        "coverage_area": "Whitefield, Marathahalli, KR Puram, Old Airport Rd",
        "contact_email": "east.publicworks@roadlens.gov.in",
        "contact_phone": "+91 80 2567 8901",
        "hq_latitude": 12.9569,
        "hq_longitude": 77.7011,
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
