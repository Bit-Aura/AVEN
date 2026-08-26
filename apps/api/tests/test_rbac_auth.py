"""
RBAC & Authentication Test Suite.

Verifies:
1. Public registration role escalation prevention (all registrations force LEARNER).
2. Default development/demo Admin account (admin@aven.com / Aven@123) bootstrap and password hashing.
3. Login credential verification, JWT token issuance, and account suspension enforcement.
4. Role-based endpoint authorization matrix across LEARNER, MENTOR, and ADMIN.
5. Admin role management (promoting LEARNER -> MENTOR and protecting last admin).
"""
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.core.db import async_session
from app.core.auth import ensure_default_admin, verify_password, hash_password
from app.models.domain import User, LearnerProfile, MentorSessionRequest

@pytest.fixture
def test_client():
    return TestClient(app)

def uid() -> str:
    return uuid.uuid4().hex[:8]


# ---------------------------------------------------------------------------
# 1. PUBLIC REGISTRATION & ROLE ESCALATION PREVENTION
# ---------------------------------------------------------------------------

def test_public_registration_forces_learner_role(test_client):
    """
    Public registration must always result in role == 'LEARNER'.
    Attempts to submit role='ADMIN' or role='MENTOR' must be rejected/ignored.
    """
    email_learner = f"reg_learner_{uid()}@pathfinder.dev"
    email_admin_attempt = f"reg_fake_admin_{uid()}@pathfinder.dev"
    email_mentor_attempt = f"reg_fake_mentor_{uid()}@pathfinder.dev"

    # 1. Standard registration
    res1 = test_client.post("/api/v1/auth/register", json={
        "email": email_learner,
        "password": "SecurePassword123!",
        "name": "Standard Learner",
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["user"]["role"] == "LEARNER"
    assert data1["access_token"] is not None

    # 2. Attempt role escalation to ADMIN
    res2 = test_client.post("/api/v1/auth/register", json={
        "email": email_admin_attempt,
        "password": "SecurePassword123!",
        "name": "Hacker Admin Attempt",
        "role": "ADMIN",
    })
    assert res2.status_code == 200
    data2 = res2.json()
    # Must still be LEARNER
    assert data2["user"]["role"] == "LEARNER"

    # 3. Attempt role escalation to MENTOR
    res3 = test_client.post("/api/v1/auth/register", json={
        "email": email_mentor_attempt,
        "password": "SecurePassword123!",
        "name": "Hacker Mentor Attempt",
        "role": "MENTOR",
    })
    assert res3.status_code == 200
    data3 = res3.json()
    # Must still be LEARNER
    assert data3["user"]["role"] == "LEARNER"


# ---------------------------------------------------------------------------
# 2. DEFAULT ADMIN ACCOUNT (admin@aven.com / Aven@123)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_default_admin_account_bootstrap_and_login(test_client):
    """
    Verifies admin@aven.com / Aven@123 is seeded idempotently,
    stored with a secure PBKDF2 hash, and can authenticate.
    """
    async with async_session() as session:
        admin_user = await ensure_default_admin(session)
        assert admin_user.email == "admin@aven.com"
        assert admin_user.role == "ADMIN"
        assert admin_user.password_hash != "Aven@123"
        assert verify_password("Aven@123", admin_user.password_hash) is True

    # Authenticate via login API
    res = test_client.post("/api/v1/auth/login", json={
        "email": "admin@aven.com",
        "password": "Aven@123",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["email"] == "admin@aven.com"
    assert data["user"]["role"] == "ADMIN"
    assert "access_token" in data

    # Verify /api/v1/auth/me returns ADMIN
    token = data["access_token"]
    res_me = test_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["role"] == "ADMIN"


# ---------------------------------------------------------------------------
# 3. AUTHENTICATION VALIDATION & ACCOUNT SUSPENSION
# ---------------------------------------------------------------------------

def test_login_validation_and_deactivated_account(test_client):
    """
    Ensures incorrect credentials return 401 and suspended accounts return 403.
    """
    user_email = f"susp_user_{uid()}@pathfinder.dev"
    reg_res = test_client.post("/api/v1/auth/register", json={
        "email": user_email,
        "password": "ValidPassword999!",
        "name": "Suspended Test",
    })
    assert reg_res.status_code == 200
    user_id = reg_res.json()["user"]["id"]

    # 1. Wrong password -> 401
    res_wrong = test_client.post("/api/v1/auth/login", json={
        "email": user_email,
        "password": "WrongPassword!",
    })
    assert res_wrong.status_code == 401

    # 2. Suspend user via admin API
    admin_headers = {"X-User-Email": "admin@aven.com"}
    res_suspend = test_client.patch(
        f"/api/v1/admin/users/{user_id}/status",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert res_suspend.status_code == 200
    assert res_suspend.json()["is_active"] is False

    # 3. Suspended user login -> 403 Forbidden
    res_susp_login = test_client.post("/api/v1/auth/login", json={
        "email": user_email,
        "password": "ValidPassword999!",
    })
    assert res_susp_login.status_code == 403
    assert "deactivated or suspended" in res_susp_login.json()["detail"]


# ---------------------------------------------------------------------------
# 4. RBAC AUTHORIZATION MATRIX & ENDPOINT PERMISSIONS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_rbac_endpoint_authorization_matrix(test_client):
    """
    Verifies role boundaries:
    - LEARNER cannot view open requests or accept requests (403).
    - MENTOR cannot access Admin user management (403).
    - ADMIN can access Admin user management and view all requests.
    """
    u_suffix = uid()
    learner_email = f"matrix_learner_{u_suffix}@pathfinder.dev"
    mentor_email = f"matrix_mentor_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        u_l = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Matrix Learner", role="LEARNER", is_active=True)
        u_m = User(clerk_id=f"clerk_{mentor_email}", email=mentor_email, name="Matrix Mentor", role="MENTOR", is_active=True)
        session.add_all([u_l, u_m])
        await session.flush()
        session.add(LearnerProfile(user_id=u_l.id))
        session.add(LearnerProfile(user_id=u_m.id))
        await session.commit()

    learner_headers = {"X-User-Email": learner_email}
    mentor_headers = {"X-User-Email": mentor_email}
    admin_headers = {"X-User-Email": "admin@aven.com"}

    # 1. Learner tries to view open requests -> 403 Forbidden
    res_l_open = test_client.get("/api/v1/mentor-connect/open-requests", headers=learner_headers)
    assert res_l_open.status_code == 403

    # 2. Mentor views open requests -> 200 OK
    res_m_open = test_client.get("/api/v1/mentor-connect/open-requests", headers=mentor_headers)
    assert res_m_open.status_code == 200

    # 3. Mentor tries to access Admin user management -> 403 Forbidden
    res_m_admin = test_client.get("/api/v1/admin/users", headers=mentor_headers)
    assert res_m_admin.status_code == 403

    # 4. Admin accesses Admin user management -> 200 OK
    res_a_admin = test_client.get("/api/v1/admin/users", headers=admin_headers)
    assert res_a_admin.status_code == 200


# ---------------------------------------------------------------------------
# 5. ADMIN ROLE PROMOTION (LEARNER -> MENTOR)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_role_promotion_workflow(test_client):
    """
    Verifies that an Admin can promote a LEARNER to MENTOR,
    granting immediate access to Mentor Connect endpoints.
    """
    u_suffix = uid()
    student_email = f"student_promote_{u_suffix}@pathfinder.dev"

    # Register as LEARNER
    reg_res = test_client.post("/api/v1/auth/register", json={
        "email": student_email,
        "password": "Password123!",
        "name": "Promotable Student",
    })
    assert reg_res.status_code == 200
    student_id = reg_res.json()["user"]["id"]
    student_headers = {"X-User-Email": student_email}

    # Before promotion: open requests is 403 Forbidden
    res_before = test_client.get("/api/v1/mentor-connect/open-requests", headers=student_headers)
    assert res_before.status_code == 403

    # Admin promotes student to MENTOR
    admin_headers = {"X-User-Email": "admin@aven.com"}
    res_promote = test_client.patch(
        f"/api/v1/admin/users/{student_id}/role",
        json={"role": "MENTOR"},
        headers=admin_headers,
    )
    assert res_promote.status_code == 200
    assert res_promote.json()["role"] == "MENTOR"

    # After promotion: user can access open requests feed (200 OK)
    res_after = test_client.get("/api/v1/mentor-connect/open-requests", headers=student_headers)
    assert res_after.status_code == 200


# ---------------------------------------------------------------------------
# 6. INVALID & EXPIRED JWT TOKEN REJECTION
# ---------------------------------------------------------------------------

def test_invalid_and_expired_jwt_token_rejection(test_client):
    """
    Ensures invalid or expired Bearer tokens return 401 Unauthorized.
    """
    from datetime import timedelta
    from app.core.auth import create_access_token

    # 1. Malformed token -> 401
    res_bad = test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer malformed.invalid.token.signature"},
    )
    assert res_bad.status_code == 401
    assert "Invalid or expired" in res_bad.json()["detail"]

    # 2. Expired token -> 401
    expired_token = create_access_token(
        {"sub": "admin@aven.com", "role": "ADMIN"},
        expires_delta=timedelta(seconds=-60),
    )
    res_expired = test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res_expired.status_code == 401
    assert "Invalid or expired" in res_expired.json()["detail"]


# ---------------------------------------------------------------------------
# 7. LAST ADMIN DEMOTION PROTECTION
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_last_admin_demotion_safeguard(test_client):
    """
    Ensures the platform rejects demoting the last active administrator.
    """
    admin_headers = {"X-User-Email": "admin@aven.com"}

    # Fetch admin user ID
    res_users = test_client.get("/api/v1/admin/users?q=admin@aven.com", headers=admin_headers)
    assert res_users.status_code == 200
    admin_id = next(u["id"] for u in res_users.json()["users"] if u["email"] == "admin@aven.com")

    # Attempt to demote to LEARNER
    res_demote = test_client.patch(
        f"/api/v1/admin/users/{admin_id}/role",
        json={"role": "LEARNER"},
        headers=admin_headers,
    )
    assert res_demote.status_code == 400
    assert "demote" in res_demote.json()["detail"].lower()
