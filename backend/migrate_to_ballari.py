"""
One-time migration: rewrite existing Bengaluru demo data to Ballari, Karnataka.

The startup seeds use $setOnInsert, so databases seeded before the Ballari
change still contain the old Bengaluru divisions/users/complaints. This script
updates those existing documents in place (idempotent - safe to re-run):
  - authorities: division names/zones/coverage areas + Ballari HQ coordinates
  - users: authority_name / full_name text
  - complaints: location names, assigned authority names, history notes,
    seeded complaint coordinates
  - notifications: title/message text

Usage:
    cd backend
    python migrate_to_ballari.py
"""
import os
import re
import sys

from dotenv import load_dotenv
from pymongo import MongoClient

DB_NAME = "roadlens_db"

# Division id -> Ballari HQ coordinates (must match server.py / seed_authorities.py)
HQ_COORDS = {
    "auth-downtown": (15.1394, 76.9214),
    "auth-north": (15.2050, 76.8930),
    "auth-south": (15.1050, 76.9100),
    "auth-suburban": (15.1600, 76.9800),
}

# Seeded complaint id -> Ballari coordinates
COMPLAINT_COORDS = {
    "comp-seed-1": (15.1390, 76.9210),
    "comp-seed-2": (15.2050, 76.8930),
    "comp-seed-3": (15.1050, 76.9100),
}

# Exact string fixes for seeded demo locations/landmarks
TEXT_FIXES = {
    "MG Road & Trinity Junction, Central Ballari": "Gandhi Nagar Main Road & Court Circle, Central Ballari",
    "MG Road & Trinity Junction.": "Gandhi Nagar Main Road & Court Circle.",
    "Ballari Road (NH-44), Hebbal Flyover Stretch": "Hospet Road (NH-50), Kudithini Stretch",
    "Near Hebbal Flyover": "Near Kudithini Junction",
    "Near Trinity Metro Station": "Near Court Circle Junction",
    "Electronic City Phase 1 Access Road": "Kappagal Road Industrial Area Access Road",
    "Pothole on MG Road": "Pothole on Gandhi Nagar Main Road",
    "Crack on Ballari Road (NH-44)": "Crack on Hospet Road (NH-50)",
    "MG Road Pothole": "Gandhi Nagar Main Road Pothole",
    "Ballari Road Crack": "Hospet Road Crack",
    "the Trinity Junction": "the Court Circle junction",
    "Electronic City access road": "Kappagal Road access stretch",
}

# Old division coverage areas -> Ballari coverage areas
COVERAGE_FIXES = {
    "MG Road, Residency Rd, Shivajinagar, Trinity Circle": "Gandhi Nagar, Cowl Bazaar, Brucepeta, Court Circle",
    "Hebbal, Yelahanka, BEL Road, Airport Corridor (NH-44)": "Kudithini, Moka, Hospet Rd, NH-50 Corridor",
    "Jayanagar, BTM Layout, Bommasandra, Electronic City": "Kappagal, Allipuram, BSS Hill, Industrial Estate",
    "Whitefield, Marathahalli, KR Puram, Old Airport Rd": "Siruguppa Rd, Vaddaragatti, Bukkasagara, Moka Rd",
}


def walk_replace(value, replacements):
    """Recursively replace substrings inside dicts/lists/strings."""
    if isinstance(value, str):
        for old, new in replacements.items():
            if old in value:
                value = value.replace(old, new)
        if "Bengaluru" in value:
            value = value.replace("Bengaluru", "Ballari")
        return value
    if isinstance(value, list):
        return [walk_replace(v, replacements) for v in value]
    if isinstance(value, dict):
        return {k: walk_replace(v, replacements) for k, v in value.items()}
    return value


def main() -> None:
    load_dotenv()
    mongo_url = os.getenv("MONGO_URL", "").strip()
    if not mongo_url:
        print("Error: MONGO_URL not set (add it to backend/.env or the environment).")
        sys.exit(1)

    client = MongoClient(mongo_url, serverSelectionTimeoutMS=15000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"Error: could not reach MongoDB - {e}")
        sys.exit(1)
    db = client[DB_NAME]

    text_fixes = {**TEXT_FIXES, **COVERAGE_FIXES}

    # 1. Authorities: text + Ballari HQ coordinates + Ballari phone STD code
    for auth in db.authorities.find({}):
        updates = walk_replace(
            {k: auth[k] for k in ("name", "zone", "coverage_area") if k in auth},
            text_fixes,
        )
        if "contact_phone" in auth and "+91 80 " in auth["contact_phone"]:
            updates["contact_phone"] = auth["contact_phone"].replace("+91 80 ", "+91 8392 ")
        coords = HQ_COORDS.get(auth.get("id"))
        if coords:
            updates["hq_latitude"], updates["hq_longitude"] = coords
        if updates:
            db.authorities.update_one({"_id": auth["_id"]}, {"$set": updates})
            print(f"authority  {auth.get('id')}: updated")

    # 2. Users: authority_name / full_name text
    for user in db.users.find({}):
        updates = walk_replace(
            {k: user[k] for k in ("authority_name", "full_name", "name") if k in user},
            text_fixes,
        )
        if updates:
            db.users.update_one({"_id": user["_id"]}, {"$set": updates})
            print(f"user       {user.get('email')}: updated")

    # 3. Complaints: text everywhere + seeded coordinates
    for complaint in db.complaints.find({}):
        doc = walk_replace(complaint, text_fixes)
        updates = {
            k: doc[k]
            for k in ("title", "description", "location_name", "landmark",
                      "assigned_authority_name", "status_history", "repair_evidence",
                      "user_name")
            if doc.get(k) != complaint.get(k) and doc.get(k) is not None
        }
        coords = COMPLAINT_COORDS.get(complaint.get("id"))
        if coords and (complaint.get("latitude") != coords[0] or complaint.get("longitude") != coords[1]):
            updates["latitude"], updates["longitude"] = coords
        if updates:
            db.complaints.update_one({"_id": complaint["_id"]}, {"$set": updates})
            print(f"complaint  {complaint.get('id')}: updated")

    # 4. Notifications: title/message text
    for note in db.notifications.find({}):
        updates = walk_replace(
            {k: note[k] for k in ("title", "message") if k in note},
            text_fixes,
        )
        if updates:
            db.notifications.update_one({"_id": note["_id"]}, {"$set": updates})
            print(f"notification {note.get('id', note['_id'])}: updated")

    print("\nMigration complete - all Bengaluru references rewritten to Ballari.")


if __name__ == "__main__":
    main()
