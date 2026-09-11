import os
import re
import json
import uuid
import base64
import hashlib
import secrets
import logging
import ipaddress
import random
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING
from motor.motor_asyncio import AsyncIOMotorClient
from jose import JWTError, jwt
from passlib.context import CryptContext

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("roadlens")

# Config
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "roadlens_db")
JWT_SECRET = os.getenv("JWT_SECRET", "c9f8a3d5829147efb1263c94821a73d5e0a6b18c72f53491e4b8592c73081e64")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "1440"))
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "")
RESET_CODE_MINUTES = int(os.getenv("RESET_CODE_MINUTES", "20"))

# Emergent managed email (Resend). Base URL is a constant so it survives deployment.
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.getenv("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "RoadLens")

# Emergent managed Google OAuth session-data endpoint (called ONLY from backend)
EMERGENT_OAUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# MongoDB async client
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# --- Enums & Constants ---
class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    AUTHORITY = "AUTHORITY"


class DamageType(str, Enum):
    POTHOLE = "Pothole"
    CRACK = "Crack"
    SURFACE_DAMAGE = "Surface Damage"
    NO_DAMAGE = "No supported road damage detected"


class SeverityLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"


class ComplaintStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    ASSIGNED = "ASSIGNED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


# --- Schemas ---
class BoundingBox(BaseModel):
    x: float = 0.0  # Percentage left (0 - 100)
    y: float = 0.0  # Percentage top (0 - 100)
    width: float = 0.0  # Percentage width (0 - 100)
    height: float = 0.0  # Percentage height (0 - 100)


class StatusHistoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str
    previous_status: Optional[str] = None
    changed_by_user_id: str
    changed_by_name: str
    changed_by_role: str
    notes: Optional[str] = ""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RepairEvidence(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    notes: Optional[str] = ""
    resolved_by_name: Optional[str] = ""
    resolved_at: Optional[str] = None


class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class DemoLoginRequest(BaseModel):
    role: UserRole


class GoogleSessionRequest(BaseModel):
    session_id: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


class AuthorityUserCreate(BaseModel):
    email: str
    password: str
    name: str
    authority_id: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class PublicUser(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    name: str
    role: UserRole
    status: str = "ACTIVE"
    authority_id: Optional[str] = None
    authority_name: Optional[str] = None
    phone: Optional[str] = None
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PublicUser


class InspectionCreate(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = 37.7749
    longitude: Optional[float] = -122.4194
    location_name: Optional[str] = "Market St & 5th St, Downtown"
    source_type: Optional[str] = "camera"  # camera, gallery, sample


class InspectionResult(BaseModel):
    id: str
    user_id: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    detected: bool
    damage_type: str
    confidence: float
    severity: str
    severity_reason: str
    bounding_box: BoundingBox
    recommended_action: str
    estimated_repair_priority: str
    latitude: float
    longitude: float
    location_name: str
    created_at: str


class ComplaintCreate(BaseModel):
    inspection_id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    damage_type: str
    severity: str
    confidence: float
    bounding_box: Optional[BoundingBox] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    latitude: float
    longitude: float
    location_name: str
    landmark: Optional[str] = ""


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    notes: Optional[str] = ""
    repair_image_base64: Optional[str] = None
    repair_image_url: Optional[str] = None


class ComplaintAssignRequest(BaseModel):
    authority_id: str
    notes: Optional[str] = ""


class AuthorityModel(BaseModel):
    id: str
    code: str
    name: str
    zone: str
    coverage_area: str
    contact_email: str
    contact_phone: str
    active_complaints_count: int = 0
    resolved_count: int = 0
    created_at: str


class AuthorityCreate(BaseModel):
    name: str
    zone: str
    coverage_area: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


# --- Helper Functions ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "iss": "roadlens-auth",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await db.users.find_one({"id": user_id})
        return user
    except Exception:
        return None


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Dict[str, Any]:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token required")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if not user or user.get("disabled", False) or user.get("status") == "DISABLED":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account disabled or not found")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def require_roles(*allowed_roles: UserRole):
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role")
        if user_role not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {[r.value for r in allowed_roles]}"
            )
        return user
    return role_checker


def format_public_user(user: Dict[str, Any]) -> PublicUser:
    email = user.get("email") or user.get("username", "")
    name = user.get("name") or user.get("full_name") or (email.split("@")[0].capitalize() if email else "User")
    return PublicUser(
        id=user.get("id", str(user.get("_id", ""))),
        username=user.get("username", email),
        email=email,
        full_name=name,
        name=name,
        role=user.get("role", UserRole.USER),
        status=user.get("status", "ACTIVE"),
        authority_id=user.get("authority_id"),
        authority_name=user.get("authority_name"),
        phone=user.get("phone"),
        created_at=user.get("created_at", datetime.now(timezone.utc).isoformat())
    )


async def create_notification(
    user_id: Optional[str],
    title: str,
    message: str,
    notification_type: str,
    complaint_id: Optional[str] = None,
    severity: Optional[str] = "LOW",
    broadcast_role: Optional[str] = None
):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "broadcast_role": broadcast_role,
        "title": title,
        "message": message,
        "notification_type": notification_type,  # STATUS_CHANGE, ASSIGNMENT, RESOLUTION, ALERT
        "complaint_id": complaint_id,
        "severity": severity,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notif)
    return notif


# --- Emergent Managed Email (Resend) with guardrail gate ---
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY not configured; skipping email send.")
        return None
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as http_client:
            resp = await http_client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return None


def build_reset_email_html(name: str, code: str) -> str:
    return (
        '<table role="presentation" width="100%" style="max-width:480px;margin:auto;'
        'font-family:Arial,sans-serif"><tr><td style="padding:24px">'
        '<h2 style="color:#0F2A4A;margin:0 0 8px">RoadLens Password Reset</h2>'
        f'<p style="color:#334155;font-size:14px">Hi {escape(name)}, we received a request '
        'to reset your RoadLens password.</p>'
        '<p style="color:#334155;font-size:14px">Enter this verification code in the app to set a new password:</p>'
        f'<p style="font-size:30px;font-weight:800;letter-spacing:6px;color:#0F2A4A;'
        f'background:#EEF2F7;padding:14px;border-radius:10px;text-align:center;margin:16px 0">{escape(code)}</p>'
        '<p style="color:#64748B;font-size:12px">This code expires in 20 minutes. '
        'If you did not request this, you can safely ignore this email. '
        'RoadLens will never ask you for your password by email.</p>'
        '<p style="font-size:12px;color:#94A3B8;margin-top:16px">Sent by RoadLens Civic Infrastructure.</p>'
        '</td></tr></table>'
    )


# --- App Initialization ---
app = FastAPI(title="RoadLens AI Civic Inspection API")
api_router = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup_event():
    logger.info("Initializing RoadLens Database and Indexes...")
    try:
        await db.users.create_index([("username", ASCENDING)], unique=True)
        await db.users.create_index([("email", ASCENDING)])
        await db.complaints.create_index([("created_at", DESCENDING)])
        await db.complaints.create_index([("status", ASCENDING)])
        await db.complaints.create_index([("user_id", ASCENDING)])
        await db.complaints.create_index([("assigned_authority_id", ASCENDING)])
        await db.authorities.create_index([("code", ASCENDING)], unique=True)
        await db.notifications.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        await db.password_reset_codes.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"Index creation note: {e}")

    # Backfill: ensure legacy user docs have email/name/status fields for new auth flow
    try:
        async for u in db.users.find({"$or": [{"email": {"$exists": False}}, {"status": {"$exists": False}}]}):
            await db.users.update_one(
                {"id": u["id"]},
                {"$set": {
                    "email": u.get("email", u.get("username", "")),
                    "name": u.get("name", u.get("full_name", "")),
                    "status": u.get("status", "ACTIVE"),
                    "auth_provider": u.get("auth_provider", "password"),
                }}
            )
    except Exception as e:
        logger.warning(f"User backfill note: {e}")

    # Seed Demo Authorities
    authorities_data = [
        {
            "id": "auth-downtown",
            "code": "AUTH-DOWNTOWN",
            "name": "Downtown Roads & Works Division",
            "zone": "Downtown & Central District",
            "coverage_area": "Downtown, Market St, 1st - 10th Ave",
            "contact_email": "downtown.repairs@roadlens.gov",
            "contact_phone": "+1 (555) 019-2831",
            "active_complaints_count": 0,
            "resolved_count": 12,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "auth-north",
            "code": "AUTH-NORTH",
            "name": "North Metro Highway Dept",
            "zone": "North Metropolitan Sector",
            "coverage_area": "North Metro, Highway 101, Bay Area Blvd",
            "contact_email": "north.highways@roadlens.gov",
            "contact_phone": "+1 (555) 019-5482",
            "active_complaints_count": 0,
            "resolved_count": 8,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "auth-south",
            "code": "AUTH-SOUTH",
            "name": "South Regional Infrastructure Corp",
            "zone": "South Corridor & Industrial Park",
            "coverage_area": "South Valley, 12th - 40th St, Portway",
            "contact_email": "south.infra@roadlens.gov",
            "contact_phone": "+1 (555) 019-9943",
            "active_complaints_count": 0,
            "resolved_count": 15,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "auth-suburban",
            "code": "AUTH-SUBURBAN",
            "name": "West Suburban Public Works",
            "zone": "Suburban West & Hills",
            "coverage_area": "Westwood, Hillside Dr, Forest Ridge Rd",
            "contact_email": "west.publicworks@roadlens.gov",
            "contact_phone": "+1 (555) 019-7712",
            "active_complaints_count": 0,
            "resolved_count": 6,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]

    for auth in authorities_data:
        await db.authorities.update_one({"id": auth["id"]}, {"$setOnInsert": auth}, upsert=True)

    # Seed Default Users for 3 roles
    seed_users = [
        {
            "id": "user-citizen-1",
            "username": "citizen@roadlens.gov",
            "email": "citizen@roadlens.gov",
            "password_hash": hash_password("Citizen@123"),
            "full_name": "Elena Rostova (Citizen)",
            "name": "Elena Rostova",
            "phone": "+1 (555) 234-5678",
            "role": UserRole.USER.value,
            "status": "ACTIVE",
            "auth_provider": "password",
            "authority_id": None,
            "authority_name": None,
            "disabled": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "user-authority-1",
            "username": "authority@roadlens.gov",
            "email": "authority@roadlens.gov",
            "password_hash": hash_password("Authority@123"),
            "full_name": "Marcus Vance (Lead Field Engineer)",
            "name": "Marcus Vance",
            "phone": "+1 (555) 345-6789",
            "role": UserRole.AUTHORITY.value,
            "status": "ACTIVE",
            "auth_provider": "password",
            "authority_id": "auth-downtown",
            "authority_name": "Downtown Roads & Works Division",
            "disabled": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "user-admin-1",
            "username": "admin@roadlens.gov",
            "email": "admin@roadlens.gov",
            "password_hash": hash_password("Admin@123"),
            "full_name": "Director Sarah Jenkins (Municipal Admin)",
            "name": "Sarah Jenkins",
            "phone": "+1 (555) 456-7890",
            "role": UserRole.ADMIN.value,
            "status": "ACTIVE",
            "auth_provider": "password",
            "authority_id": None,
            "authority_name": None,
            "disabled": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]

    for u in seed_users:
        existing = await db.users.find_one({"username": u["username"]})
        if not existing:
            await db.users.insert_one(u)

    # Seed initial complaints if collection is empty
    count = await db.complaints.count_documents({})
    if count == 0:
        logger.info("Seeding initial RoadLens complaints...")
        sample_complaints = [
            {
                "id": "comp-seed-1",
                "inspection_id": "insp-seed-1",
                "user_id": "user-citizen-1",
                "user_name": "Elena Rostova (Citizen)",
                "title": "Severe Pothole on Market & 4th Cross",
                "description": "Deep tire-damaging pothole causing vehicle swerving near pedestrian crosswalk.",
                "damage_type": "Pothole",
                "severity": "HIGH",
                "confidence": 94.8,
                "bounding_box": {"x": 22.5, "y": 38.0, "width": 45.0, "height": 34.0},
                "image_url": "https://images.unsplash.com/photo-1709934730506-fba12664d4e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwzfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
                "image_base64": None,
                "latitude": 37.7858,
                "longitude": -122.4065,
                "location_name": "Market St & 4th St, Downtown",
                "landmark": "Near Central Metro Station",
                "status": ComplaintStatus.IN_PROGRESS.value,
                "assigned_authority_id": "auth-downtown",
                "assigned_authority_name": "Downtown Roads & Works Division",
                "repair_evidence": None,
                "status_history": [
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.SUBMITTED.value,
                        "previous_status": None,
                        "changed_by_user_id": "user-citizen-1",
                        "changed_by_name": "Elena Rostova (Citizen)",
                        "changed_by_role": "USER",
                        "notes": "Citizen submitted road damage report with AI vision verification.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.ASSIGNED.value,
                        "previous_status": ComplaintStatus.SUBMITTED.value,
                        "changed_by_user_id": "system",
                        "changed_by_name": "Auto-Dispatch Geo Engine",
                        "changed_by_role": "SYSTEM",
                        "notes": "Auto-routed to Downtown Roads & Works Division based on Downtown location.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=4, minutes=50)).isoformat()
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.ACKNOWLEDGED.value,
                        "previous_status": ComplaintStatus.ASSIGNED.value,
                        "changed_by_user_id": "user-authority-1",
                        "changed_by_name": "Marcus Vance (Lead Field Engineer)",
                        "changed_by_role": "AUTHORITY",
                        "notes": "Field unit acknowledged ticket. Crew dispatched with asphalt cold-patch truck.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.IN_PROGRESS.value,
                        "previous_status": ComplaintStatus.ACKNOWLEDGED.value,
                        "changed_by_user_id": "user-authority-1",
                        "changed_by_name": "Marcus Vance (Lead Field Engineer)",
                        "changed_by_role": "AUTHORITY",
                        "notes": "Work underway on site. Lane closed safely with cones.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
                    }
                ],
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
                "updated_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            },
            {
                "id": "comp-seed-2",
                "inspection_id": "insp-seed-2",
                "user_id": "user-citizen-1",
                "user_name": "Elena Rostova (Citizen)",
                "title": "Longitudinal Structural Crack on North Expressway",
                "description": "Continuous 8-meter longitudinal crack expanding along outer shoulder line.",
                "damage_type": "Crack",
                "severity": "MEDIUM",
                "confidence": 88.5,
                "bounding_box": {"x": 15.0, "y": 25.0, "width": 60.0, "height": 50.0},
                "image_url": "https://images.unsplash.com/photo-1635068741358-ab1b9813623f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
                "image_base64": None,
                "latitude": 37.8012,
                "longitude": -122.4180,
                "location_name": "North Metro Expressway, Mile Marker 14",
                "landmark": "Near Bay Overpass",
                "status": ComplaintStatus.RESOLVED.value,
                "assigned_authority_id": "auth-north",
                "assigned_authority_name": "North Metro Highway Dept",
                "repair_evidence": {
                    "image_url": "https://images.unsplash.com/photo-1635068741358-ab1b9813623f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
                    "image_base64": None,
                    "notes": "Sealed with polymer-modified hot bitumen sealant. Surface tested level and approved.",
                    "resolved_by_name": "North Metro Field Crew #3",
                    "resolved_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
                },
                "status_history": [
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.SUBMITTED.value,
                        "previous_status": None,
                        "changed_by_user_id": "user-citizen-1",
                        "changed_by_name": "Elena Rostova (Citizen)",
                        "changed_by_role": "USER",
                        "notes": "Submitted with AI crack detection.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(days=1, hours=4)).isoformat()
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.ASSIGNED.value,
                        "previous_status": ComplaintStatus.SUBMITTED.value,
                        "changed_by_user_id": "system",
                        "changed_by_name": "Auto-Dispatch Geo Engine",
                        "changed_by_role": "SYSTEM",
                        "notes": "Assigned to North Metro Highway Dept.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(days=1, hours=3)).isoformat()
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.ACKNOWLEDGED.value,
                        "previous_status": ComplaintStatus.ASSIGNED.value,
                        "changed_by_user_id": "auth-north",
                        "changed_by_name": "North Metro Highway Dept",
                        "changed_by_role": "AUTHORITY",
                        "notes": "Acknowledged by road maintenance.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.IN_PROGRESS.value,
                        "previous_status": ComplaintStatus.ACKNOWLEDGED.value,
                        "changed_by_user_id": "auth-north",
                        "changed_by_name": "North Metro Highway Dept",
                        "changed_by_role": "AUTHORITY",
                        "notes": "Sealant application in progress.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.RESOLVED.value,
                        "previous_status": ComplaintStatus.IN_PROGRESS.value,
                        "changed_by_user_id": "auth-north",
                        "changed_by_name": "North Metro Highway Dept",
                        "changed_by_role": "AUTHORITY",
                        "notes": "Repair completed with hot-pour sealant. Evidence verified.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
                    }
                ],
                "created_at": (datetime.now(timezone.utc) - timedelta(days=1, hours=4)).isoformat(),
                "updated_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            },
            {
                "id": "comp-seed-3",
                "inspection_id": "insp-seed-3",
                "user_id": "user-citizen-1",
                "user_name": "Elena Rostova (Citizen)",
                "title": "Minor Surface Degradation & Raveling",
                "description": "Asphalt wear and loose aggregate gravel on South Industrial access road.",
                "damage_type": "Surface Damage",
                "severity": "LOW",
                "confidence": 82.1,
                "bounding_box": {"x": 30.0, "y": 40.0, "width": 40.0, "height": 30.0},
                "image_url": "https://images.unsplash.com/photo-1709934730506-fba12664d4e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwzfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZSUyMGluc3BlY3Rpb258ZW58MHx8fHwxNzg5MDU0ODY2fDA&ixlib=rb-4.1.0&q=85",
                "image_base64": None,
                "latitude": 37.7345,
                "longitude": -122.3912,
                "location_name": "South Industrial Park Access Way",
                "landmark": "Near Warehouse Gate 4",
                "status": ComplaintStatus.SUBMITTED.value,
                "assigned_authority_id": None,
                "assigned_authority_name": None,
                "repair_evidence": None,
                "status_history": [
                    {
                        "id": str(uuid.uuid4()),
                        "status": ComplaintStatus.SUBMITTED.value,
                        "previous_status": None,
                        "changed_by_user_id": "user-citizen-1",
                        "changed_by_name": "Elena Rostova (Citizen)",
                        "changed_by_role": "USER",
                        "notes": "New inspection submitted by citizen.",
                        "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat()
                    }
                ],
                "created_at": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat(),
                "updated_at": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat()
            }
        ]
        await db.complaints.insert_many(sample_complaints)

        # Update authority counts
        await db.authorities.update_one({"id": "auth-downtown"}, {"$set": {"active_complaints_count": 1}})
        await db.authorities.update_one({"id": "auth-north"}, {"$set": {"active_complaints_count": 0, "resolved_count": 9}})

        # Seed initial notification
        await create_notification(
            user_id="user-citizen-1",
            title="Work In Progress: Market St Pothole",
            message="Downtown Roads & Works Division has started on-site repair at Market St & 4th St.",
            notification_type="STATUS_CHANGE",
            complaint_id="comp-seed-1",
            severity="HIGH"
        )
        await create_notification(
            user_id="user-citizen-1",
            title="Complaint Resolved: North Metro Crack",
            message="North Metro Highway Dept resolved ticket with hot-pour polymer sealant.",
            notification_type="RESOLUTION",
            complaint_id="comp-seed-2",
            severity="MEDIUM"
        )


# ==============================================================================
# Auth Routes
# ==============================================================================
@api_router.post("/auth/register", response_model=TokenResponse, status_code=201)
async def register(body: UserRegister):
    email = body.email.lower().strip()
    if not email or "@" not in email or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Valid email required and password must be >= 6 characters")

    existing = await db.users.find_one({"username": email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Security: public registration ALWAYS creates a USER. Role is never taken from the client.
    role = UserRole.USER.value
    name = (body.name or "").strip() or email.split("@")[0].capitalize()

    user_doc = {
        "id": str(uuid.uuid4()),
        "username": email,
        "email": email,
        "password_hash": hash_password(body.password),
        "full_name": name,
        "name": name,
        "phone": body.phone or "",
        "role": role,
        "status": "ACTIVE",
        "auth_provider": "password",
        "authority_id": None,
        "authority_name": None,
        "disabled": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["id"], role)
    return TokenResponse(access_token=token, user=format_public_user(user_doc))


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin):
    email = body.email.lower().strip()
    user = await db.users.find_one({"username": email})
    if not user or user.get("disabled") or user.get("status") == "DISABLED" or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["id"], user.get("role", UserRole.USER.value))
    return TokenResponse(access_token=token, user=format_public_user(user))


@api_router.post("/auth/session", response_model=TokenResponse)
async def google_session(body: GoogleSessionRequest):
    """
    Exchanges an Emergent Google OAuth session_id (one-time) for a RoadLens JWT.
    Upserts the user by email. New Google users are always created as USER.
    """
    try:
        async with httpx.AsyncClient(timeout=25.0) as http_client:
            resp = await http_client.get(
                EMERGENT_OAUTH_SESSION_URL,
                headers={"X-Session-ID": body.session_id}
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired Google session")
        data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google session exchange error: {e}")
        raise HTTPException(status_code=401, detail="Could not verify Google session")

    email = (data.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=401, detail="Google account did not provide an email")
    name = data.get("name") or email.split("@")[0].capitalize()

    user = await db.users.find_one({"username": email})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "username": email,
            "email": email,
            "password_hash": "",
            "full_name": name,
            "name": name,
            "phone": "",
            "role": UserRole.USER.value,
            "status": "ACTIVE",
            "auth_provider": "google",
            "authority_id": None,
            "authority_name": None,
            "disabled": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    elif user.get("disabled") or user.get("status") == "DISABLED":
        raise HTTPException(status_code=403, detail="This account has been disabled")

    token = create_access_token(user["id"], user.get("role", UserRole.USER.value))
    return TokenResponse(access_token=token, user=format_public_user(user))


@api_router.post("/auth/forgot-password", status_code=202)
async def forgot_password(body: ForgotPasswordRequest):
    """Generates a one-time reset code and emails it. Always returns a generic response."""
    email = body.email.lower().strip()
    user = await db.users.find_one({"username": email})
    if user and user.get("auth_provider") != "google":
        code = f"{random.randint(0, 999999):06d}"
        await db.password_reset_codes.delete_many({"email": email})
        await db.password_reset_codes.insert_one({
            "email": email,
            "code_hash": hashlib.sha256(code.encode()).hexdigest(),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=RESET_CODE_MINUTES),
            "used": False,
            "created_at": datetime.now(timezone.utc)
        })
        await send_email(
            to=email,
            subject="Your RoadLens password reset code",
            html=build_reset_email_html(user.get("name") or user.get("full_name") or "there", code)
        )
    return {"message": "If an account exists for that email, a reset code has been sent."}


@api_router.post("/auth/reset-password")
async def reset_password(body: ResetPasswordRequest):
    email = body.email.lower().strip()
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    code_hash = hashlib.sha256(body.code.strip().encode()).hexdigest()
    record = await db.password_reset_codes.find_one_and_update(
        {"email": email, "code_hash": code_hash, "used": False,
         "expires_at": {"$gt": datetime.now(timezone.utc)}},
        {"$set": {"used": True}}
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    await db.users.update_one(
        {"username": email},
        {"$set": {"password_hash": hash_password(body.new_password)}}
    )
    return {"message": "Password reset successfully. Please log in with your new password."}


@api_router.post("/auth/demo-login", response_model=TokenResponse)
async def demo_login(body: DemoLoginRequest):
    role_map = {
        UserRole.USER: "citizen@roadlens.gov",
        UserRole.AUTHORITY: "authority@roadlens.gov",
        UserRole.ADMIN: "admin@roadlens.gov"
    }
    username = role_map.get(body.role)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid demo role requested")

    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not found")

    token = create_access_token(user["id"], user.get("role", body.role.value))
    return TokenResponse(access_token=token, user=format_public_user(user))


@api_router.get("/auth/me", response_model=PublicUser)
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return format_public_user(user)


@api_router.patch("/auth/me", response_model=PublicUser)
async def update_me(body: UpdateProfileRequest, user: Dict[str, Any] = Depends(get_current_user)):
    updates: Dict[str, Any] = {}
    if body.name is not None and body.name.strip():
        updates["name"] = body.name.strip()
        updates["full_name"] = body.name.strip()
    if body.phone is not None:
        updates["phone"] = body.phone.strip()
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]})
    return format_public_user(fresh)


@api_router.post("/admin/authority-users", response_model=PublicUser, status_code=201)
async def create_authority_user(
    body: AuthorityUserCreate,
    current_user: Dict[str, Any] = Depends(require_roles(UserRole.ADMIN))
):
    """Admin-only: create an AUTHORITY login account linked to an authority department."""
    email = body.email.lower().strip()
    if not email or "@" not in email or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Valid email and password (>= 6 chars) required")

    authority = await db.authorities.find_one({"id": body.authority_id})
    if not authority:
        raise HTTPException(status_code=404, detail="Authority department not found")

    existing = await db.users.find_one({"username": email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user_doc = {
        "id": str(uuid.uuid4()),
        "username": email,
        "email": email,
        "password_hash": hash_password(body.password),
        "full_name": body.name.strip(),
        "name": body.name.strip(),
        "phone": "",
        "role": UserRole.AUTHORITY.value,
        "status": "ACTIVE",
        "auth_provider": "password",
        "authority_id": authority["id"],
        "authority_name": authority["name"],
        "disabled": False,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return format_public_user(user_doc)


# ==============================================================================
# AI Road Damage Inspection & Analysis
# ==============================================================================
@api_router.post("/inspections/analyze", response_model=InspectionResult)
async def analyze_road_damage(
    body: InspectionCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Analyzes road image using GPT-5.4 Vision for potholes, cracks, surface damage.
    Returns detected boolean, damage_type, confidence, severity (HIGH/MEDIUM/LOW),
    severity_reason, bounding_box coords, recommended action, repair priority.
    """
    image_base64 = body.image_base64
    image_url = body.image_url
    lat = body.latitude or 37.7749
    lng = body.longitude or -122.4194
    loc_name = body.location_name or "Inspected Road Segment"

    if not image_base64 and not image_url:
        raise HTTPException(status_code=400, detail="Either image_base64 or image_url is required")

    # Call GPT-5.4 Vision via Emergent LLM Key
    system_prompt = (
        "You are RoadLens AI, a specialized civil engineering and municipal road infrastructure computer vision system. "
        "Analyze the provided road/pavement image for physical road surface damage. "
        "Supported damage types: 'Pothole', 'Crack', 'Surface Damage'. "
        "If the image clearly does not contain road damage (e.g. clean smooth road, indoor photo, unrelated object, person, pet), set detected=false and damage_type='No supported road damage detected'. "
        "Return ONLY a JSON object strictly adhering to this format (no markdown blocks, just raw JSON):\n"
        "{\n"
        '  "detected": true,\n'
        '  "damage_type": "Pothole" | "Crack" | "Surface Damage" | "No supported road damage detected",\n'
        '  "confidence": 94.5,\n'
        '  "severity": "HIGH" | "MEDIUM" | "LOW" | "NONE",\n'
        '  "severity_reason": "Detailed hazard explanation (e.g. deep cavity posing tire puncture risk to high-speed traffic)",\n'
        '  "bounding_box": {"x": 20.0, "y": 35.0, "width": 45.0, "height": 30.0},\n'
        '  "recommended_action": "e.g. Hot-mix asphalt patch and base compaction",\n'
        '  "estimated_repair_priority": "P1 - Immediate Hazard (24h)" | "P2 - Moderate (72h)" | "P3 - Routine Maintenance"\n'
        "}\n"
        "Note: bounding_box x, y, width, height must be numbers between 0 and 100 representing percentage offsets within the image. "
        "Severity rules: Deep large potholes or structural transverse cracks across lanes = HIGH (Red). Moderate longitudinal cracks or medium depressions = MEDIUM (Orange). Minor surface raveling/fissures = LOW (Green)."
    )

    ai_data = None
    if EMERGENT_LLM_KEY:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"insp-{uuid.uuid4().hex[:8]}",
                system_message=system_prompt
            ).with_model("openai", "gpt-5.4")

            user_msg_content = "Analyze this road surface image for damage, severity, bounding box, and repair recommendation."
            
            # Prepare image payload - GPT Vision needs the actual image bytes, not a URL string.
            clean_b64 = None
            if image_base64:
                clean_b64 = image_base64
                if "," in clean_b64:
                    clean_b64 = clean_b64.split(",")[1]
            elif image_url:
                # Download the remote image and convert to base64 so the model can actually see it
                async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as http_client:
                    img_resp = await http_client.get(image_url)
                    img_resp.raise_for_status()
                    clean_b64 = base64.b64encode(img_resp.content).decode("utf-8")

            if not clean_b64:
                raise ValueError("No decodable image content available for analysis")

            img_payload = ImageContent(image_base64=clean_b64)
            message = UserMessage(text=user_msg_content, file_contents=[img_payload])

            response = await chat.send_message(message)
            raw_text = response.strip() if isinstance(response, str) else getattr(response, "text", str(response)).strip()
            # Clean markdown code blocks if present
            cleaned = re.sub(r"^```json\s*", "", raw_text)
            cleaned = re.sub(r"^```\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()
            ai_data = json.loads(cleaned)
            logger.info(f"AI Vision parsed result: {ai_data.get('damage_type')}, severity={ai_data.get('severity')}")
        except Exception as e:
            logger.warning(f"GPT-5.4 Vision call failed: {e}")
            ai_data = None

    # NO fabricated detections. If the AI could not analyze the image, fail honestly.
    if not ai_data:
        raise HTTPException(
            status_code=503,
            detail="AI road-damage analysis is temporarily unavailable. Please try again in a moment."
        )

    detected = bool(ai_data.get("detected", False))

    if detected:
        bbox_data = ai_data.get("bounding_box") or {}
        bounding_box = BoundingBox(
            x=float(bbox_data.get("x", 20.0)),
            y=float(bbox_data.get("y", 30.0)),
            width=float(bbox_data.get("width", 50.0)),
            height=float(bbox_data.get("height", 35.0))
        )
        damage_type = ai_data.get("damage_type") or "Surface Damage"
        # Guard against the model marking detected=true but returning the no-damage label
        if str(damage_type).lower().startswith("no supported"):
            detected = False
            damage_type = "No supported road damage detected"
            severity = "NONE"
            confidence = 0.0
            bounding_box = BoundingBox(x=0.0, y=0.0, width=0.0, height=0.0)
        else:
            severity = ai_data.get("severity") or "MEDIUM"
            confidence = float(ai_data.get("confidence", 0.0))
    else:
        bounding_box = BoundingBox(x=0.0, y=0.0, width=0.0, height=0.0)
        damage_type = "No supported road damage detected"
        severity = "NONE"
        confidence = 0.0

    inspection_id = f"insp-{uuid.uuid4().hex[:10]}"
    if detected:
        severity_reason = ai_data.get("severity_reason") or "Road surface damage detected."
        recommended_action = ai_data.get("recommended_action") or "Municipal resurfacing inspection."
        repair_priority = ai_data.get("estimated_repair_priority") or "P2 - Standard"
    else:
        severity_reason = "No supported road damage detected in this image."
        recommended_action = "No action required. Please capture a clearer road-surface image if damage is present."
        repair_priority = "N/A"
    doc = {
        "id": inspection_id,
        "user_id": current_user.get("id") if current_user else None,
        "image_url": image_url,
        "image_base64": image_base64,
        "detected": detected,
        "damage_type": damage_type,
        "confidence": confidence,
        "severity": severity,
        "severity_reason": severity_reason,
        "bounding_box": bounding_box.dict(),
        "recommended_action": recommended_action,
        "estimated_repair_priority": repair_priority,
        "latitude": lat,
        "longitude": lng,
        "location_name": loc_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.inspections.insert_one(doc)

    return InspectionResult(**doc)


# ==============================================================================
# Complaints CRUD & Lifecycle Workflow
# ==============================================================================
def find_matching_authority(lat: float, lng: float, location_name: str, authorities_list: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    loc_lower = (location_name or "").lower()
    for auth in authorities_list:
        zone_lower = auth.get("zone", "").lower()
        cov_lower = auth.get("coverage_area", "").lower()
        if "downtown" in loc_lower and "downtown" in zone_lower:
            return auth
        if "north" in loc_lower and "north" in zone_lower:
            return auth
        if "south" in loc_lower and "south" in zone_lower:
            return auth
        if "west" in loc_lower or "suburban" in loc_lower and "suburban" in zone_lower:
            return auth

    # Default to first available authority if coordinates exist
    if authorities_list:
        return authorities_list[0]
    return None


@api_router.post("/complaints", status_code=201)
async def create_complaint(
    body: ComplaintCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submits a new civic road damage complaint.
    Auto-assigns to Demo Authority based on location/zone when possible;
    otherwise marks SUBMITTED / UNASSIGNED for Admin assignment.
    """
    complaint_id = f"comp-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Guard: complaint must reference a real inspection that detected supported damage.
    inspection = await db.inspections.find_one({"id": body.inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Referenced inspection not found.")
    if not inspection.get("detected"):
        raise HTTPException(
            status_code=400,
            detail="Cannot file a complaint: no supported road damage was detected in this inspection."
        )

    # Find authorities for auto-assignment
    authorities = await db.authorities.find({"deleted": {"$ne": True}}).to_list(100)
    matched_auth = find_matching_authority(body.latitude, body.longitude, body.location_name, authorities)

    status_val = ComplaintStatus.ASSIGNED.value if matched_auth else ComplaintStatus.SUBMITTED.value
    assigned_auth_id = matched_auth["id"] if matched_auth else None
    assigned_auth_name = matched_auth["name"] if matched_auth else None

    # Status History
    status_history = [
        {
            "id": str(uuid.uuid4()),
            "status": ComplaintStatus.SUBMITTED.value,
            "previous_status": None,
            "changed_by_user_id": current_user["id"],
            "changed_by_name": current_user.get("full_name", current_user["username"]),
            "changed_by_role": current_user.get("role", "USER"),
            "notes": "Citizen submitted road damage report with AI vision verification.",
            "timestamp": now_iso
        }
    ]

    if matched_auth:
        status_history.append({
            "id": str(uuid.uuid4()),
            "status": ComplaintStatus.ASSIGNED.value,
            "previous_status": ComplaintStatus.SUBMITTED.value,
            "changed_by_user_id": "system",
            "changed_by_name": "Auto-Dispatch Geo Engine",
            "changed_by_role": "SYSTEM",
            "notes": f"Auto-assigned to {matched_auth['name']} based on {matched_auth.get('zone', 'zone')}.",
            "timestamp": now_iso
        })
        # Increment active count for authority
        await db.authorities.update_one({"id": matched_auth["id"]}, {"$inc": {"active_complaints_count": 1}})

    bbox_dict = body.bounding_box.dict() if body.bounding_box else {"x": 20.0, "y": 30.0, "width": 50.0, "height": 35.0}

    complaint_doc = {
        "id": complaint_id,
        "inspection_id": body.inspection_id,
        "user_id": current_user["id"],
        "user_name": current_user.get("full_name", current_user["username"]),
        "user_phone": current_user.get("phone", ""),
        "title": body.title,
        "description": body.description,
        "damage_type": body.damage_type,
        "severity": body.severity,
        "confidence": body.confidence,
        "bounding_box": bbox_dict,
        "image_url": body.image_url,
        "image_base64": body.image_base64,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "location_name": body.location_name,
        "landmark": body.landmark or "",
        "status": status_val,
        "assigned_authority_id": assigned_auth_id,
        "assigned_authority_name": assigned_auth_name,
        "repair_evidence": None,
        "status_history": status_history,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    await db.complaints.insert_one(complaint_doc)

    # In-app notifications
    await create_notification(
        user_id=current_user["id"],
        title=f"Complaint #{complaint_id[-5:].upper()} Filed",
        message=f"Your road damage report at '{body.location_name}' was received with {body.severity} severity rating.",
        notification_type="STATUS_CHANGE",
        complaint_id=complaint_id,
        severity=body.severity
    )

    if matched_auth:
        await create_notification(
            user_id=None,
            broadcast_role=UserRole.AUTHORITY.value,
            title=f"New Dispatch Assigned: #{complaint_id[-5:].upper()}",
            message=f"New {body.damage_type} ({body.severity}) assigned to {matched_auth['name']}.",
            notification_type="ASSIGNMENT",
            complaint_id=complaint_id,
            severity=body.severity
        )

    # Clean MongoDB _id before returning
    complaint_doc.pop("_id", None)
    return complaint_doc


@api_router.get("/complaints")
async def list_complaints(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    mine_only: Optional[bool] = Query(False),
    assigned_to_me: Optional[bool] = Query(False),
    search: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    List complaints with flexible role-aware filtering.
    """
    query: Dict[str, Any] = {}

    if status and status != "ALL":
        query["status"] = status
    if severity and severity != "ALL":
        query["severity"] = severity

    if current_user:
        if mine_only or (current_user.get("role") == UserRole.USER.value and mine_only):
            query["user_id"] = current_user["id"]
        elif assigned_to_me or current_user.get("role") == UserRole.AUTHORITY.value and assigned_to_me:
            # Check authority id
            user_auth_id = current_user.get("authority_id") or "auth-downtown"
            query["assigned_authority_id"] = user_auth_id

    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"title": search_regex},
            {"location_name": search_regex},
            {"damage_type": search_regex},
            {"landmark": search_regex}
        ]

    cursor = db.complaints.find(query).sort("created_at", DESCENDING).limit(200)
    complaints = await cursor.to_list(200)
    for c in complaints:
        c.pop("_id", None)
    return complaints


@api_router.get("/complaints/{complaint_id}")
async def get_complaint_details(
    complaint_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    complaint = await db.complaints.find_one({"id": complaint_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint.pop("_id", None)
    return complaint


@api_router.patch("/complaints/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: str,
    body: ComplaintStatusUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Transitions complaint status through the workflow:
    SUBMITTED -> ASSIGNED -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> CLOSED
    Enforces role permissions and saves status history.
    """
    complaint = await db.complaints.find_one({"id": complaint_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    user_role = current_user.get("role")
    prev_status = complaint.get("status")
    target_status = body.status.value
    now_iso = datetime.now(timezone.utc).isoformat()

    # Valid status progressions map
    valid_transitions = {
        ComplaintStatus.SUBMITTED.value: [ComplaintStatus.ASSIGNED.value],
        ComplaintStatus.ASSIGNED.value: [ComplaintStatus.ACKNOWLEDGED.value, ComplaintStatus.IN_PROGRESS.value],
        ComplaintStatus.ACKNOWLEDGED.value: [ComplaintStatus.IN_PROGRESS.value],
        ComplaintStatus.IN_PROGRESS.value: [ComplaintStatus.RESOLVED.value],
        ComplaintStatus.RESOLVED.value: [ComplaintStatus.CLOSED.value],
        ComplaintStatus.CLOSED.value: []
    }

    # Permission check
    if user_role == UserRole.USER.value:
        # Citizen can only close their OWN resolved complaint
        if complaint.get("user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only update your own complaints.")
        if target_status == ComplaintStatus.CLOSED.value and prev_status == ComplaintStatus.RESOLVED.value:
            pass
        else:
            raise HTTPException(status_code=403, detail="Citizens can only close resolved complaints.")
    elif user_role == UserRole.AUTHORITY.value:
        # Authority can only act on complaints assigned to their own authority
        assigned_auth_id = complaint.get("assigned_authority_id")
        if not assigned_auth_id:
            raise HTTPException(status_code=403, detail="This complaint is unassigned. Await Admin assignment.")
        if current_user.get("authority_id") and assigned_auth_id != current_user.get("authority_id"):
            raise HTTPException(status_code=403, detail="You can only update complaints assigned to your authority.")
        # Authority can transition ASSIGNED -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED
        allowed_authority_targets = [
            ComplaintStatus.ACKNOWLEDGED.value,
            ComplaintStatus.IN_PROGRESS.value,
            ComplaintStatus.RESOLVED.value
        ]
        if target_status not in allowed_authority_targets:
            raise HTTPException(status_code=403, detail=f"Authorities cannot set status to {target_status}.")
        if prev_status and target_status not in valid_transitions.get(prev_status, []):
            raise HTTPException(status_code=400, detail=f"Invalid transition from {prev_status} to {target_status}.")
        if target_status == ComplaintStatus.RESOLVED.value and not body.repair_image_base64 and not body.repair_image_url and not body.notes:
            raise HTTPException(status_code=400, detail="Repair proof image or work completion notes required to resolve.")
    elif user_role == UserRole.ADMIN.value:
        # Admin may force-close any active complaint, otherwise must follow the workflow map
        if target_status == ComplaintStatus.CLOSED.value:
            pass
        elif prev_status and target_status not in valid_transitions.get(prev_status, []):
            raise HTTPException(status_code=400, detail=f"Invalid transition from {prev_status} to {target_status}.")
    else:
        raise HTTPException(status_code=403, detail="Unauthorized role.")

    # Status History entry
    history_entry = {
        "id": str(uuid.uuid4()),
        "status": target_status,
        "previous_status": prev_status,
        "changed_by_user_id": current_user["id"],
        "changed_by_name": current_user.get("full_name", current_user["username"]),
        "changed_by_role": user_role,
        "notes": body.notes or f"Status transitioned to {target_status}.",
        "timestamp": now_iso
    }

    update_fields: Dict[str, Any] = {
        "status": target_status,
        "updated_at": now_iso
    }

    # Handle resolution evidence
    if target_status == ComplaintStatus.RESOLVED.value:
        repair_data = {
            "image_url": body.repair_image_url or complaint.get("image_url"),
            "image_base64": body.repair_image_base64,
            "notes": body.notes or "Repair completed and verified by authority crew.",
            "resolved_by_name": current_user.get("full_name", current_user["username"]),
            "resolved_at": now_iso
        }
        update_fields["repair_evidence"] = repair_data
        # Update authority resolved count
        auth_id = complaint.get("assigned_authority_id")
        if auth_id:
            await db.authorities.update_one(
                {"id": auth_id},
                {"$inc": {"resolved_count": 1, "active_complaints_count": -1}}
            )

    await db.complaints.update_one(
        {"id": complaint_id},
        {
            "$set": update_fields,
            "$push": {"status_history": history_entry}
        }
    )

    # Notifications
    complaint_title = complaint.get("title", "Road damage")
    citizen_user_id = complaint.get("user_id")

    status_messages = {
        ComplaintStatus.ACKNOWLEDGED.value: f"Authority acknowledged '{complaint_title}'. Repair crew scheduled.",
        ComplaintStatus.IN_PROGRESS.value: f"Active repair work has started on site for '{complaint_title}'.",
        ComplaintStatus.RESOLVED.value: f"Repair complete! Field evidence uploaded for '{complaint_title}'.",
        ComplaintStatus.CLOSED.value: f"Complaint #{complaint_id[-5:].upper()} verified and closed. Thank you for making our roads safer!"
    }

    msg = status_messages.get(target_status, f"Status updated to {target_status} for '{complaint_title}'.")

    if citizen_user_id:
        await create_notification(
            user_id=citizen_user_id,
            title=f"Status Update: {target_status}",
            message=msg,
            notification_type="STATUS_CHANGE",
            complaint_id=complaint_id,
            severity=complaint.get("severity", "LOW")
        )

    # Admin notification for resolution or closing
    if target_status in [ComplaintStatus.RESOLVED.value, ComplaintStatus.CLOSED.value]:
        await create_notification(
            user_id=None,
            broadcast_role=UserRole.ADMIN.value,
            title=f"Ticket {target_status}: #{complaint_id[-5:].upper()}",
            message=f"{current_user.get('full_name')} set complaint #{complaint_id[-5:].upper()} to {target_status}.",
            notification_type="STATUS_CHANGE",
            complaint_id=complaint_id,
            severity=complaint.get("severity", "LOW")
        )

    updated = await db.complaints.find_one({"id": complaint_id})
    updated.pop("_id", None)
    return updated


@api_router.post("/complaints/{complaint_id}/assign")
async def assign_complaint_authority(
    complaint_id: str,
    body: ComplaintAssignRequest,
    current_user: Dict[str, Any] = Depends(require_roles(UserRole.ADMIN))
):
    """
    Admin assigns or reassigns a complaint to a specific authority.
    """
    complaint = await db.complaints.find_one({"id": complaint_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    authority = await db.authorities.find_one({"id": body.authority_id})
    if not authority:
        raise HTTPException(status_code=404, detail="Authority not found")

    prev_status = complaint.get("status")
    now_iso = datetime.now(timezone.utc).isoformat()

    history_entry = {
        "id": str(uuid.uuid4()),
        "status": ComplaintStatus.ASSIGNED.value,
        "previous_status": prev_status,
        "changed_by_user_id": current_user["id"],
        "changed_by_name": current_user.get("full_name", current_user["username"]),
        "changed_by_role": UserRole.ADMIN.value,
        "notes": body.notes or f"Admin assigned ticket to {authority['name']}.",
        "timestamp": now_iso
    }

    # If reassigning from another authority, adjust counts
    old_auth_id = complaint.get("assigned_authority_id")
    if old_auth_id and old_auth_id != authority["id"]:
        await db.authorities.update_one({"id": old_auth_id}, {"$inc": {"active_complaints_count": -1}})
    await db.authorities.update_one({"id": authority["id"]}, {"$inc": {"active_complaints_count": 1}})

    await db.complaints.update_one(
        {"id": complaint_id},
        {
            "$set": {
                "assigned_authority_id": authority["id"],
                "assigned_authority_name": authority["name"],
                "status": ComplaintStatus.ASSIGNED.value,
                "updated_at": now_iso
            },
            "$push": {"status_history": history_entry}
        }
    )

    # Notify Citizen and Authority
    citizen_id = complaint.get("user_id")
    if citizen_id:
        await create_notification(
            user_id=citizen_id,
            title="Authority Assigned",
            message=f"Your complaint #{complaint_id[-5:].upper()} is assigned to {authority['name']}.",
            notification_type="ASSIGNMENT",
            complaint_id=complaint_id,
            severity=complaint.get("severity", "LOW")
        )

    await create_notification(
        user_id=None,
        broadcast_role=UserRole.AUTHORITY.value,
        title=f"Manual Dispatch: #{complaint_id[-5:].upper()}",
        message=f"Admin dispatched complaint at '{complaint.get('location_name')}' to {authority['name']}.",
        notification_type="ASSIGNMENT",
        complaint_id=complaint_id,
        severity=complaint.get("severity", "LOW")
    )

    updated = await db.complaints.find_one({"id": complaint_id})
    updated.pop("_id", None)
    return updated


# ==============================================================================
# Authorities & Admin Management
# ==============================================================================
@api_router.get("/authorities", response_model=List[AuthorityModel])
async def list_authorities():
    cursor = db.authorities.find({"deleted": {"$ne": True}}).sort("name", ASCENDING)
    authorities = await cursor.to_list(100)
    for a in authorities:
        a.pop("_id", None)
    return authorities


@api_router.post("/authorities", response_model=AuthorityModel, status_code=201)
async def create_authority(
    body: AuthorityCreate,
    current_user: Dict[str, Any] = Depends(require_roles(UserRole.ADMIN))
):
    """Admin-only: create a new authority department with a name and coverage zone."""
    name = body.name.strip()
    zone = body.zone.strip()
    if not name or not zone:
        raise HTTPException(status_code=400, detail="Department name and zone are required")

    # Generate a stable id + human-readable code from the name
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:24] or uuid.uuid4().hex[:8]
    authority_id = f"auth-{slug}-{uuid.uuid4().hex[:4]}"
    code = "AUTH-" + re.sub(r"[^A-Z0-9]+", "", name.upper())[:10]

    doc = {
        "id": authority_id,
        "code": code or f"AUTH-{uuid.uuid4().hex[:5].upper()}",
        "name": name,
        "zone": zone,
        "coverage_area": (body.coverage_area or zone).strip(),
        "contact_email": (body.contact_email or "").strip(),
        "contact_phone": (body.contact_phone or "").strip(),
        "active_complaints_count": 0,
        "resolved_count": 0,
        "deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.authorities.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/authorities/{authority_id}")
async def delete_authority(
    authority_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(UserRole.ADMIN))
):
    """Admin-only: remove an authority department (soft delete). Blocked if it has active complaints."""
    authority = await db.authorities.find_one({"id": authority_id, "deleted": {"$ne": True}})
    if not authority:
        raise HTTPException(status_code=404, detail="Authority department not found")

    active = await db.complaints.count_documents({
        "assigned_authority_id": authority_id,
        "status": {"$nin": [ComplaintStatus.RESOLVED.value, ComplaintStatus.CLOSED.value]}
    })
    if active > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot remove: {active} active complaint(s) are still assigned. Reassign or resolve them first."
        )

    await db.authorities.update_one(
        {"id": authority_id},
        {"$set": {"deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Authority department removed", "id": authority_id}


@api_router.get("/admin/stats")
async def get_admin_stats(current_user: Dict[str, Any] = Depends(require_roles(UserRole.ADMIN, UserRole.AUTHORITY))):
    """
    Returns governance stats: total, by status, by severity, authorities count, users count.
    """
    total = await db.complaints.count_documents({})
    submitted = await db.complaints.count_documents({"status": ComplaintStatus.SUBMITTED.value})
    assigned = await db.complaints.count_documents({"status": ComplaintStatus.ASSIGNED.value})
    acknowledged = await db.complaints.count_documents({"status": ComplaintStatus.ACKNOWLEDGED.value})
    in_progress = await db.complaints.count_documents({"status": ComplaintStatus.IN_PROGRESS.value})
    resolved = await db.complaints.count_documents({"status": ComplaintStatus.RESOLVED.value})
    closed = await db.complaints.count_documents({"status": ComplaintStatus.CLOSED.value})

    high = await db.complaints.count_documents({"severity": SeverityLevel.HIGH.value})
    medium = await db.complaints.count_documents({"severity": SeverityLevel.MEDIUM.value})
    low = await db.complaints.count_documents({"severity": SeverityLevel.LOW.value})

    authorities_count = await db.authorities.count_documents({})
    users_count = await db.users.count_documents({})

    resolution_rate = round(((resolved + closed) / max(total, 1)) * 100, 1)

    return {
        "total_complaints": total,
        "resolution_rate_percent": resolution_rate,
        "by_status": {
            "SUBMITTED": submitted,
            "ASSIGNED": assigned,
            "ACKNOWLEDGED": acknowledged,
            "IN_PROGRESS": in_progress,
            "RESOLVED": resolved,
            "CLOSED": closed
        },
        "by_severity": {
            "HIGH": high,
            "MEDIUM": medium,
            "LOW": low
        },
        "authorities_count": authorities_count,
        "users_count": users_count
    }


@api_router.get("/admin/users")
async def list_admin_users(current_user: Dict[str, Any] = Depends(require_roles(UserRole.ADMIN))):
    users = await db.users.find().sort("created_at", DESCENDING).to_list(100)
    return [format_public_user(u) for u in users]


# ==============================================================================
# Notifications
# ==============================================================================
@api_router.get("/notifications")
async def get_notifications(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    user_role = current_user.get("role", "USER")

    query = {
        "$or": [
            {"user_id": user_id},
            {"broadcast_role": user_role},
            {"broadcast_role": "ALL"}
        ]
    }
    cursor = db.notifications.find(query).sort("created_at", DESCENDING).limit(50)
    items = await cursor.to_list(50)
    for it in items:
        it.pop("_id", None)
    return items


@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    await db.notifications.update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    user_role = current_user.get("role", "USER")
    query = {
        "$or": [
            {"user_id": user_id},
            {"broadcast_role": user_role}
        ]
    }
    await db.notifications.update_many(query, {"$set": {"read": True}})
    return {"ok": True}


# ==============================================================================
# Root & Health Check
# ==============================================================================
@api_router.get("/")
async def root():
    return {
        "app": "RoadLens AI API",
        "version": "1.0.0",
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "roadlens-backend"}


# Mount API Router
app.include_router(api_router)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
