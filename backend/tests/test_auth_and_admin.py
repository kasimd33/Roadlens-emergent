"""
Backend regression tests for RoadLens auth (register/login/me/forgot/reset),
role-protected admin authority creation, and complaint lifecycle sanity.
"""
import os
import uuid
import pytest
import requests

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL") or "https://roadlens-demo.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@roadlens.gov"
ADMIN_PASSWORD = "Admin@123"
CITIZEN_EMAIL = "citizen@roadlens.gov"
CITIZEN_PASSWORD = "Citizen@123"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    return r


# ---------------- Auth: register ----------------
class TestAuthRegister:
    def test_register_creates_user_role_regardless_of_client_payload(self):
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@roadlens.test"
        # Attempt to sneak in role=ADMIN – must be ignored server-side
        payload = {"email": email, "password": "Passw0rd!", "name": "TEST User", "role": "ADMIN"}
        r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "USER"
        assert data["user"]["status"] == "ACTIVE"
        assert data["user"]["email"] == email.lower()

    def test_register_duplicate_email_returns_409(self):
        email = f"TEST_dup_{uuid.uuid4().hex[:8]}@roadlens.test"
        p = {"email": email, "password": "Passw0rd!"}
        r1 = requests.post(f"{API}/auth/register", json=p, timeout=30)
        assert r1.status_code == 201, r1.text
        r2 = requests.post(f"{API}/auth/register", json=p, timeout=30)
        assert r2.status_code == 409


# ---------------- Auth: login / me ----------------
class TestAuthLoginMe:
    def test_login_success_and_me(self):
        r = _login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "USER"
        token = data["access_token"]
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert me.status_code == 200
        body = me.json()
        assert body["email"] == CITIZEN_EMAIL
        assert body["role"] == "USER"
        assert body["status"] == "ACTIVE"
        assert "id" in body

    def test_login_wrong_password_returns_401_generic(self):
        r = _login(CITIZEN_EMAIL, "WRONG_PASSWORD")
        assert r.status_code == 401
        assert "invalid" in r.json()["detail"].lower()

    def test_me_without_token_returns_401(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------------- Auth: forgot / reset password ----------------
class TestPasswordReset:
    def test_forgot_password_returns_202_generic_for_existing_email(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": CITIZEN_EMAIL}, timeout=30)
        assert r.status_code == 202
        assert "message" in r.json()
        # Generic message – no enumeration
        assert "if an account exists" in r.json()["message"].lower()

    def test_forgot_password_returns_202_for_unknown_email_no_enumeration(self):
        r = requests.post(
            f"{API}/auth/forgot-password",
            json={"email": f"TEST_missing_{uuid.uuid4().hex[:8]}@no.test"},
            timeout=30,
        )
        assert r.status_code == 202
        assert r.json()["message"] == \
            "If an account exists for that email, a reset code has been sent."

    def test_reset_password_with_invalid_code_returns_400(self):
        r = requests.post(
            f"{API}/auth/reset-password",
            json={"email": CITIZEN_EMAIL, "code": "000000", "new_password": "NewPass@123"},
            timeout=30,
        )
        assert r.status_code == 400
        assert "invalid" in r.json()["detail"].lower() or "expired" in r.json()["detail"].lower()


# ---------------- Admin: authority-users role protection ----------------
class TestAdminAuthorityUsers:
    def _admin_token(self):
        r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200, r.text
        return r.json()["access_token"]

    def test_admin_can_create_authority_user_and_that_user_can_login(self):
        token = self._admin_token()
        email = f"TEST_auth_{uuid.uuid4().hex[:8]}@roadlens.test"
        password = "Auth@1234"
        payload = {"email": email, "password": password, "name": "TEST Authority Agent",
                   "authority_id": "auth-north"}
        r = requests.post(
            f"{API}/admin/authority-users",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert r.status_code == 201, r.text
        u = r.json()
        assert u["role"] == "AUTHORITY"
        assert u["authority_id"] == "auth-north"
        assert u["email"] == email.lower()

        # Confirm the created authority user can log in
        login_r = _login(email, password)
        assert login_r.status_code == 200, login_r.text
        assert login_r.json()["user"]["role"] == "AUTHORITY"

    def test_admin_create_authority_invalid_authority_id_returns_404(self):
        token = self._admin_token()
        payload = {"email": f"TEST_bad_{uuid.uuid4().hex[:8]}@roadlens.test",
                   "password": "Passw0rd!", "name": "X", "authority_id": "auth-does-not-exist"}
        r = requests.post(
            f"{API}/admin/authority-users",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert r.status_code == 404

    def test_admin_create_authority_duplicate_email_returns_409(self):
        token = self._admin_token()
        email = f"TEST_dup_auth_{uuid.uuid4().hex[:8]}@roadlens.test"
        payload = {"email": email, "password": "Passw0rd!", "name": "Dup Auth",
                   "authority_id": "auth-north"}
        r1 = requests.post(
            f"{API}/admin/authority-users",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert r1.status_code == 201, r1.text
        r2 = requests.post(
            f"{API}/admin/authority-users",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert r2.status_code == 409

    def test_user_role_cannot_create_authority_returns_403(self):
        r = _login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert r.status_code == 200
        user_token = r.json()["access_token"]
        payload = {"email": f"TEST_forbid_{uuid.uuid4().hex[:8]}@roadlens.test",
                   "password": "Passw0rd!", "name": "X", "authority_id": "auth-north"}
        r2 = requests.post(
            f"{API}/admin/authority-users",
            json=payload,
            headers={"Authorization": f"Bearer {user_token}"},
            timeout=30,
        )
        assert r2.status_code == 403

    def test_no_token_authority_create_returns_401(self):
        payload = {"email": f"TEST_noauth_{uuid.uuid4().hex[:8]}@roadlens.test",
                   "password": "Passw0rd!", "name": "X", "authority_id": "auth-north"}
        r = requests.post(f"{API}/admin/authority-users", json=payload, timeout=15)
        assert r.status_code == 401


# ---------------- Regression: AI + complaint lifecycle guard ----------------
class TestComplaintRegression:
    def test_ai_analyze_pothole_and_complaint_lifecycle(self):
        r = _login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert r.status_code == 200
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        insp = requests.post(
            f"{API}/inspections/analyze",
            headers=headers,
            json={
                "image_url": "https://images.unsplash.com/photo-1709934730506-fba12664d4e4",
                "location_name": "Market St & 5th St, Downtown",
            },
            timeout=120,
        )
        assert insp.status_code == 200, insp.text
        j = insp.json()
        assert j["detected"] is True
        assert j["damage_type"] in ("Pothole", "Crack", "Surface Damage")

        # Complaint on this real detection should succeed
        comp = requests.post(
            f"{API}/complaints",
            headers=headers,
            json={
                "inspection_id": j["id"], "title": f"TEST_{uuid.uuid4().hex[:6]}",
                "description": "TEST", "damage_type": j["damage_type"],
                "severity": j["severity"], "confidence": j["confidence"],
                "bounding_box": j["bounding_box"], "image_url": j["image_url"],
                "latitude": 37.7833, "longitude": -122.4089,
                "location_name": "Market St & 5th St, Downtown",
            },
            timeout=30,
        )
        assert comp.status_code == 201, comp.text

    def test_ai_analyze_clean_image_not_detected_and_complaint_blocked(self):
        r = _login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        # Clearly-not-a-road image
        insp = requests.post(
            f"{API}/inspections/analyze",
            headers=headers,
            json={
                "image_url": "https://images.unsplash.com/photo-1517849845537-4d257902454a",
                "location_name": "Indoor Office",
            },
            timeout=120,
        )
        if insp.status_code != 200:
            pytest.skip(f"AI service response {insp.status_code}; skipping negative-detection assertion")
        j = insp.json()
        assert j["detected"] is False
        assert j["damage_type"] == "No supported road damage detected"

        # Complaint on non-detected inspection must be blocked (400)
        comp = requests.post(
            f"{API}/complaints",
            headers=headers,
            json={
                "inspection_id": j["id"], "title": "TEST_blocked",
                "damage_type": j["damage_type"], "severity": "NONE",
                "confidence": 0.0, "latitude": 0, "longitude": 0,
                "location_name": "Indoor Office",
            },
            timeout=30,
        )
        assert comp.status_code == 400
