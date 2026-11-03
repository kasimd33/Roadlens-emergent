"""
Seed multiple ADMIN accounts into a RoadLens production database (Atlas).

Production runs with ALLOW_DEMO_DATA=false, so no accounts are seeded at startup.
This creates the requested admin accounts with STRONG RANDOM passwords (printed
once at the end — save them). Emails can be overridden via env var ADMIN_EMAILS
(comma-separated) and passwords via ADMIN_PASSWORDS (comma-separated, same order).

Usage:
    cd backend
    python seed_admins.py
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

DEFAULT_EMAILS = [
    "admin@roadlens.gov",
    "commissioner@roadlens.gov",
    "jointcommissioner@roadlens.gov",
]
DEFAULT_NAMES = {
    "admin@roadlens.gov": "RoadLens System Admin",
    "commissioner@roadlens.gov": "Commissioner",
    "jointcommissioner@roadlens.gov": "Joint Commissioner",
}


def main() -> None:
    print("=== RoadLens admin seeding ===")
    mongo_url = os.getenv("MONGO_URL", "").strip()
    if not mongo_url:
        mongo_url = getpass.getpass("MONGO_URL (Atlas connection string, hidden): ").strip()
    if not mongo_url:
        print("Error: MONGO_URL is required.")
        sys.exit(1)

    emails = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()] or DEFAULT_EMAILS
    passwords = [p.strip() for p in os.getenv("ADMIN_PASSWORDS", "").split(",") if p.strip()]

    client = MongoClient(mongo_url, serverSelectionTimeoutMS=15000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"Error: could not reach MongoDB - {e}")
        sys.exit(1)

    users = client[DB_NAME].users
    created = []
    for i, email in enumerate(emails):
        if users.find_one({"username": email}):
            print(f"SKIP  {email}  (already exists)")
            continue
        password = passwords[i] if i < len(passwords) else secrets.token_urlsafe(12)
        name = DEFAULT_NAMES.get(email, email.split("@")[0].capitalize())
        users.insert_one({
            "id": str(uuid.uuid4()),
            "username": email,
            "email": email,
            "password_hash": pwd_context.hash(password),
            "full_name": name,
            "name": name,
            "phone": "",
            "role": "ADMIN",
            "status": "ACTIVE",
            "auth_provider": "password",
            "authority_id": None,
            "authority_name": None,
            "disabled": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        created.append((email, name, password))

    print("\n=== CREDENTIALS (save these now, they are not stored in plaintext) ===")
    for email, name, password in created:
        print(f"  {email}  |  {password}   ({name})")
    if not created:
        print("  (no new accounts created)")
    print("\nLog in at the website with any of these to access the admin workspace.")


if __name__ == "__main__":
    main()
