"""
Seed the SINGLE municipal authority division + its one login account into a
RoadLens production database (Atlas).

RoadLens runs with exactly ONE authority: every complaint, regardless of where
it was reported from, is routed to this division, and only this division's
login can acknowledge / progress / resolve complaints. (Citizens see this as
"routed to nearby field officers".)

This script (idempotent - safe to re-run):
  1. Upserts the single authority division.
  2. Creates the single AUTHORITY login (authority@roadlens.gov) with a STRONG
     RANDOM password (printed once at the end - save it), unless it already
     exists. Email/password can be overridden via AUTH_EMAIL / AUTH_PASSWORD
     env vars.
  3. Retires any legacy extra authority divisions and deletes every other
     AUTHORITY login, so only the single credential keeps working.

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

# The one and only authority division (must match server.py SINGLE_AUTHORITY)
AUTHORITY = {
    "id": "auth-main",
    "code": "AUTH-MAIN",
    "name": "Ballari City Roads Authority",
    "zone": "All Ballari",
    "coverage_area": "All zones and localities",
    "contact_email": "authority@roadlens.gov.in",
    "contact_phone": "+91 8392 200000",
    "hq_latitude": 15.1394,
    "hq_longitude": 76.9214,
    "active_complaints_count": 0,
    "resolved_count": 0,
    "deleted": False,
}
AUTHORITY_LOGIN_EMAIL = "authority@roadlens.gov"
AUTHORITY_LOGIN_NAME = "Priya Nair (Lead Field Engineer)"
AUTHORITY_LOGIN_PHONE = "+91 98860 23456"


def main() -> None:
    print("=== RoadLens single-authority seeding ===")
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

    # 1. The single authority division (upsert, $setOnInsert = idempotent)
    doc = {**AUTHORITY, "created_at": now}
    result = db.authorities.update_one({"id": doc["id"]}, {"$setOnInsert": doc}, upsert=True)
    status = "created" if result.upserted_id else "already exists"
    print(f"authority {doc['id']}: {status}")

    # 2. Retire legacy extra divisions (keep the single one)
    retired = db.authorities.update_many(
        {"id": {"$ne": AUTHORITY["id"]}, "deleted": {"$ne": True}},
        {"$set": {"deleted": True}}
    )
    print(f"retired divisions: {retired.modified_count}")

    # 3. The single authority login
    email = os.getenv("AUTH_EMAIL", AUTHORITY_LOGIN_EMAIL).strip().lower()
    if db.users.find_one({"username": email}):
        print(f"SKIP      {email}  (user already exists)")
        password = None
    else:
        password = os.getenv("AUTH_PASSWORD", "").strip() or secrets.token_urlsafe(12)
        db.users.insert_one({
            "id": str(uuid.uuid4()),
            "username": email,
            "email": email,
            "password_hash": pwd_context.hash(password),
            "full_name": AUTHORITY_LOGIN_NAME,
            "name": AUTHORITY_LOGIN_NAME,
            "phone": AUTHORITY_LOGIN_PHONE,
            "role": "AUTHORITY",
            "status": "ACTIVE",
            "auth_provider": "password",
            "authority_id": AUTHORITY["id"],
            "authority_name": AUTHORITY["name"],
            "disabled": False,
            "created_at": now,
        })
        print(f"created   {email}")

    # 4. Delete every other AUTHORITY login so old credentials stop working
    removed = db.users.delete_many({"role": "AUTHORITY", "username": {"$ne": email}})
    print(f"removed legacy authority logins: {removed.deleted_count}")

    # 5. Repoint all complaints to the single authority
    repointed = db.complaints.update_many(
        {"assigned_authority_id": {"$ne": AUTHORITY["id"]}},
        {"$set": {
            "assigned_authority_id": AUTHORITY["id"],
            "assigned_authority_name": AUTHORITY["name"],
        }}
    )
    print(f"repointed complaints: {repointed.modified_count}")

    print("\n=== AUTHORITY LOGIN (save it now, it is not stored in plaintext) ===")
    if password:
        print(f"  {email}  |  {password}")
    else:
        print(f"  {email}  |  (existing account - password unchanged)")
    print("\nThis is the ONLY authority account. It sees and handles every complaint:")
    print("ACKNOWLEDGE -> IN_PROGRESS -> RESOLVED (with repair proof).")


if __name__ == "__main__":
    main()
