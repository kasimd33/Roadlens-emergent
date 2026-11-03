import os
import uuid
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
BASE_URL = BASE_URL.rstrip("/")


def login(username, password):
    response = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password}, timeout=30)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["user"]["username"] == username
    return data["access_token"]


def test_health_and_demo_roles():
    health = requests.get(f"{BASE_URL}/api/health", timeout=15)
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    for role in ("USER", "AUTHORITY", "ADMIN"):
        response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": role}, timeout=15)
        assert response.status_code == 200
        assert response.json()["user"]["role"] == role


def test_admin_stats_and_notifications():
    admin_token = login("admin@roadlens.gov", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}
    stats = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers, timeout=15)
    assert stats.status_code == 200
    assert stats.json()["total_complaints"] >= 1
    notifications = requests.get(f"{BASE_URL}/api/notifications", headers=headers, timeout=15)
    assert notifications.status_code == 200
    assert isinstance(notifications.json(), list)


def test_inspection_and_complaint_creation():
    token = login("citizen@roadlens.gov", "Citizen@123")
    headers = {"Authorization": f"Bearer {token}"}
    inspection = requests.post(
        f"{BASE_URL}/api/inspections/analyze",
        headers=headers,
        json={"image_url": "https://images.unsplash.com/photo-1709934730506-fba12664d4e4", "location_name": "Market St & 5th St, Downtown"},
        timeout=90,
    )
    assert inspection.status_code == 200, inspection.text
    result = inspection.json()
    assert result["detected"] is True
    assert result["damage_type"] in ("Pothole", "Crack", "Surface Damage")
    assert 0 <= result["confidence"] <= 100
    assert all(0 <= result["bounding_box"][k] <= 100 for k in ("x", "y", "width", "height"))
    complaint = requests.post(
        f"{BASE_URL}/api/complaints",
        headers=headers,
        json={"inspection_id": result["id"], "title": f"TEST_{uuid.uuid4().hex[:8]}", "description": "TEST API lifecycle", "damage_type": result["damage_type"], "severity": result["severity"], "confidence": result["confidence"], "bounding_box": result["bounding_box"], "image_url": result["image_url"], "latitude": 37.7833, "longitude": -122.4089, "location_name": "Market St & 5th St, Downtown"},
        timeout=30,
    )
    assert complaint.status_code == 201, complaint.text
    data = complaint.json()
    assert data["status"] == "ASSIGNED"
    assert data["assigned_authority_id"]
    detail = requests.get(f"{BASE_URL}/api/complaints/{data['id']}", headers=headers, timeout=15)
    assert detail.status_code == 200
    assert detail.json()["id"] == data["id"]


def test_authority_lifecycle_and_repair_proof():
    authority_token = login("authority@roadlens.gov", "Authority@123")
    headers = {"Authorization": f"Bearer {authority_token}"}
    complaints = requests.get(f"{BASE_URL}/api/complaints", headers=headers, params={"assigned_to_me": "true"}, timeout=15)
    assert complaints.status_code == 200
    assigned = next((c for c in complaints.json() if c["status"] == "ASSIGNED"), None)
    if not assigned:
        return
    for status in ("ACKNOWLEDGED", "IN_PROGRESS"):
        response = requests.patch(f"{BASE_URL}/api/complaints/{assigned['id']}/status", headers=headers, json={"status": status, "notes": "TEST transition"}, timeout=15)
        assert response.status_code == 200, response.text
    resolved = requests.patch(f"{BASE_URL}/api/complaints/{assigned['id']}/status", headers=headers, json={"status": "RESOLVED", "notes": "TEST repair proof", "repair_image_base64": "data:image/jpeg;base64,TEST_FEATURE_IMAGE"}, timeout=15)
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()["status"] == "RESOLVED"