"""
Bootstrap the first ADMIN account for a production RoadLens database.

Production runs with ALLOW_DEMO_DATA=false, so no demo accounts (and no admin)
are seeded at startup. Public registration always creates plain USER accounts.
This script inserts the one admin account needed to administer the site.

Usage:
    cd backend
    python create_admin.py            # interactive, secrets not echoed

Or non-interactively via environment variables:
    MONGO_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... python create_admin.py
"""
import getpass
import os
import sys
import uuid
from datetime import datetime, timezone

from passlib.context import CryptContext
from pymongo import MongoClient

DB_NAME = "roadlens_db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def ask(prompt: str, env_var: str, required: bool = True) -> str:
    """Take the value from an env var if set, else prompt (hidden for secrets)."""
    value = os.getenv(env_var, "").strip()
    if value:
        print(f"{env_var}: (from environment)")
        return value
    value = getpass.getpass(prompt) if env_var in ("MONGO_URL", "ADMIN_PASSWORD") else input(prompt)
    value = value.strip()
    if required and not value:
        print("Error: this field is required.")
        sys.exit(1)
    return value


def main() -> None:
    print("=== RoadLens admin bootstrap ===")
    print("The connection string looks like: mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/\n")

    mongo_url = ask("MONGO_URL (Atlas connection string, hidden input): ", "MONGO_URL")
    email = ask("Admin email (e.g. commissioner@roadlens.gov): ", "ADMIN_EMAIL").lower()
    if "@" not in email:
        print("Error: not a valid email.")
        sys.exit(1)
    password = ask("Admin password (min 6 chars, hidden input): ", "ADMIN_PASSWORD")
    if len(password) < 6:
        print("Error: password must be at least 6 characters.")
        sys.exit(1)
    name = ask("Display name (e.g. Commissioner Vikram Desai): ", "ADMIN_NAME").strip() or email.split("@")[0].capitalize()

    client = MongoClient(mongo_url, serverSelectionTimeoutMS=15000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"Error: could not reach MongoDB - {e}")
        sys.exit(1)

    users = client[DB_NAME].users
    if users.find_one({"username": email}):
        print(f"Error: an account with email {email} already exists.")
        sys.exit(1)

    user_doc = {
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
    }
    users.insert_one(user_doc)
    print(f"\nDone. ADMIN account created: {email}  (role=ADMIN, status=ACTIVE)")
    print("Log in on the website with this email and password, then use the")
    print("admin workspace to create authority accounts and municipal divisions.")


if __name__ == "__main__":
    main()
