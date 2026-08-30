import asyncio
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.core.db import async_session
from app.models.domain import User, LearnerProfile, MentorApplication, Resource

client = TestClient(app)

def run_async(coro):
    return asyncio.run(coro)

@pytest.fixture(scope="module", autouse=True)
def setup_module_data():
    """
    Ensure baseline users (admin, learner, mentor) exist for testing.
    """
    async def _setup():
        from app.core.db import engine
        from app.models.base import Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        async with async_session() as session:
            # Create test admin
            stmt = select(User).where(User.email == "test_admin@pathfinder.dev")
            admin = (await session.execute(stmt)).scalars().first()
            if not admin:
                admin = User(
                    clerk_id="clerk_test_admin",
                    email="test_admin@pathfinder.dev",
                    name="Test Admin",
                    role="ADMIN",
                    is_active=True
                )
                session.add(admin)
                await session.flush()
                session.add(LearnerProfile(user_id=admin.id, current_context="Administrator"))
            else:
                admin.role = "ADMIN"
                admin.is_active = True

            # Create test learner
            stmt = select(User).where(User.email == "test_learner@pathfinder.dev")
            learner = (await session.execute(stmt)).scalars().first()
            if not learner:
                learner = User(
                    clerk_id="clerk_test_learner",
                    email="test_learner@pathfinder.dev",
                    name="Test Learner",
                    role="LEARNER",
                    is_active=True
                )
                session.add(learner)
                await session.flush()
                session.add(LearnerProfile(user_id=learner.id, current_context="Learner"))
            else:
                learner.role = "LEARNER"
                learner.is_active = True

            # Create test mentor
            stmt = select(User).where(User.email == "test_mentor@pathfinder.dev")
            mentor = (await session.execute(stmt)).scalars().first()
            if not mentor:
                mentor = User(
                    clerk_id="clerk_test_mentor",
                    email="test_mentor@pathfinder.dev",
                    name="Test Mentor",
                    role="MENTOR",
                    is_active=True
                )
                session.add(mentor)
                await session.flush()
                session.add(LearnerProfile(user_id=mentor.id, current_context="Mentor"))
            else:
                mentor.role = "MENTOR"
                mentor.is_active = True

            await session.commit()

    run_async(_setup())


# =============================================================================
# ADMIN OVERVIEW & SECURITY TESTS
# =============================================================================

def test_admin_overview_security_non_admin_rejected():
    """
    Non-admin user cannot access admin overview endpoint (403 Forbidden).
    """
    from tests.conftest import make_test_auth_headers
    headers = make_test_auth_headers("test_learner@pathfinder.dev", "LEARNER")
    response = client.get("/api/v1/admin/overview", headers=headers)
    assert response.status_code == 403
    assert "Admin access required" in response.json()["detail"]


def test_admin_overview_metrics_success():
    """
    Admin can access admin overview endpoint and receive real database counts.
    """
    from tests.conftest import make_test_auth_headers
    headers = make_test_auth_headers("test_admin@pathfinder.dev", "ADMIN")
    response = client.get("/api/v1/admin/overview", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "active_users" in data
    assert "total_mentors" in data
    assert "pending_mentors" in data
    assert "total_resources" in data
    assert "pending_resources" in data
    assert data["total_users"] >= 3
    assert data["total_mentors"] >= 1


def test_admin_system_status():
    """
    Admin can query platform system health.
    """
    from tests.conftest import make_test_auth_headers
    headers = make_test_auth_headers("test_admin@pathfinder.dev", "ADMIN")
    response = client.get("/api/v1/admin/system", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["api_status"] == "online"
    assert data["database_status"] == "healthy"
    assert data["scraper_sources_count"] == 5


# =============================================================================
# USER MANAGEMENT TESTS
# =============================================================================

def test_admin_user_management():
    """
    Admin can list users, search, and toggle active status.
    """
    from tests.conftest import make_test_auth_headers
    admin_headers = make_test_auth_headers("test_admin@pathfinder.dev", "ADMIN")
    
    # 1. List users
    res = client.get("/api/v1/admin/users?q=test_learner", headers=admin_headers)
    assert res.status_code == 200
    users = res.json()["users"]
    assert len(users) >= 1
    target_user = next((u for u in users if u["email"] == "test_learner@pathfinder.dev"), users[0])
    learner_id = target_user["id"]
    
    # 2. Suspend user
    res_suspend = client.patch(f"/api/v1/admin/users/{learner_id}/status", json={"is_active": False}, headers=admin_headers)
    assert res_suspend.status_code == 200
    assert res_suspend.json()["is_active"] is False
    
    # 3. Suspended user cannot take actions
    suspended_headers = make_test_auth_headers("test_learner@pathfinder.dev", "LEARNER")
    res_action = client.post("/api/v1/mentor/apply", json={"name": "Suspended", "expertise": "Dev"}, headers=suspended_headers)
    assert res_action.status_code == 403
    assert "deactivated or suspended" in res_action.json()["detail"]
    
    # 4. Reactivate user
    res_activate = client.patch(f"/api/v1/admin/users/{learner_id}/status", json={"is_active": True}, headers=admin_headers)
    assert res_activate.status_code == 200
    assert res_activate.json()["is_active"] is True


# =============================================================================
# MENTOR APPROVAL WORKFLOW TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_mentor_application_and_approval_lifecycle():
    """
    Full lifecycle:
    1. Learner applies -> PENDING
    2. Learner cannot submit resources yet
    3. Admin approves -> APPROVED -> user role becomes mentor
    4. User can now submit mentor resources
    """
    from tests.conftest import make_test_auth_headers
    unique_email = f"applicant_{uuid.uuid4().hex[:8]}@pathfinder.dev"
    async with async_session() as session:
        u = User(clerk_id=f"clerk_{unique_email}", email=unique_email, name="Jane Applicant", role="LEARNER", is_active=True)
        session.add(u)
        await session.flush()
        session.add(LearnerProfile(user_id=u.id))
        await session.commit()

    learner_headers = make_test_auth_headers(unique_email, "LEARNER")
    admin_headers = make_test_auth_headers("test_admin@pathfinder.dev", "ADMIN")
    
    # 1. Learner submits application
    res_apply = client.post(
        "/api/v1/mentor/apply",
        json={
            "name": "Jane Applicant",
            "expertise": "Distributed Systems & Go",
            "bio": "10 years backend experience.",
            "linkedin_url": "https://linkedin.com/in/jane-applicant"
        },
        headers=learner_headers
    )
    assert res_apply.status_code == 200
    app_data = res_apply.json()
    assert app_data["status"] == "PENDING"
    app_id = app_data["id"]
    
    # 2. Learner is still PENDING -> cannot submit mentor resource
    res_early_submit = client.post(
        "/api/v1/resources/submit",
        json={
            "title": "Go Microservices Guide",
            "content": "Building fast microservices.",
            "url": "https://example.com/go-guide",
            "resource_type": "tutorial"
        },
        headers=learner_headers
    )
    assert res_early_submit.status_code == 403
    assert "Approved mentor access required" in res_early_submit.json()["detail"]
    
    # 3. Non-admin cannot approve
    res_unauth_approve = client.post(f"/api/v1/admin/mentors/{app_id}/approve", headers=learner_headers)
    assert res_unauth_approve.status_code == 403
    
    # 4. Admin lists pending mentors
    res_pending = client.get("/api/v1/admin/mentors?status=PENDING", headers=admin_headers)
    assert res_pending.status_code == 200
    assert any(a["id"] == app_id for a in res_pending.json()["applications"])
    
    # 5. Admin approves application
    res_approve = client.post(f"/api/v1/admin/mentors/{app_id}/approve", headers=admin_headers)
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "APPROVED"
    
    # 6. User now has mentor role and can submit resources
    mentor_headers = make_test_auth_headers(unique_email, "MENTOR")
    res_mentor_submit = client.post(
        "/api/v1/resources/submit",
        json={
            "title": "Go Microservices Guide",
            "content": "Building fast microservices in Go.",
            "url": "https://example.com/go-guide",
            "resource_type": "tutorial",
            "skill_id": "api_design"
        },
        headers=mentor_headers
    )
    assert res_mentor_submit.status_code == 200
    assert res_mentor_submit.json()["status"] == "PENDING"


@pytest.mark.asyncio
async def test_mentor_rejection_lifecycle():
    """
    Learner applies -> Admin rejects -> status is REJECTED, user remains learner.
    """
    from tests.conftest import make_test_auth_headers
    unique_email = f"rejected_{uuid.uuid4().hex[:8]}@pathfinder.dev"
    async with async_session() as session:
        u = User(clerk_id=f"clerk_{unique_email}", email=unique_email, name="Novice Developer", role="LEARNER", is_active=True)
        session.add(u)
        await session.flush()
        session.add(LearnerProfile(user_id=u.id))
        await session.commit()

    learner_headers = make_test_auth_headers(unique_email, "LEARNER")
    admin_headers = make_test_auth_headers("test_admin@pathfinder.dev", "ADMIN")
    
    # 1. Apply
    res_apply = client.post(
        "/api/v1/mentor/apply",
        json={"name": "Novice Developer", "expertise": "HTML basics"},
        headers=learner_headers
    )
    assert res_apply.status_code == 200
    app_id = res_apply.json()["id"]
    
    # 2. Admin rejects with note
    res_reject = client.post(
        f"/api/v1/admin/mentors/{app_id}/reject",
        json={"reason": "Requires minimum 2 years production backend experience."},
        headers=admin_headers
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["status"] == "REJECTED"
    assert "minimum 2 years" in res_reject.json()["rejection_reason"]


# =============================================================================
# RESOURCE MANAGEMENT & APPROVAL WORKFLOW TESTS
# =============================================================================

def test_resource_submission_and_approval_lifecycle():
    """
    1. Approved mentor submits resource -> PENDING
    2. Not visible in public / learner resources
    3. Admin approves -> APPROVED
    4. Now visible in public resources
    """
    from tests.conftest import make_test_auth_headers
    mentor_headers = make_test_auth_headers("test_mentor@pathfinder.dev", "MENTOR")
    admin_headers = make_test_auth_headers("test_admin@pathfinder.dev", "ADMIN")
    learner_headers = make_test_auth_headers("test_learner@pathfinder.dev", "LEARNER")
    
    # 1. Mentor submits resource
    unique_title = f"Advanced PostgreSQL Indexing & Query Tuning {uuid.uuid4().hex[:6]}"
    res_submit = client.post(
        "/api/v1/resources/submit",
        json={
            "title": unique_title,
            "content": "Deep dive into B-Trees, GIN, and BRIN indexes.",
            "url": "https://example.com/postgres-indexes",
            "resource_type": "article",
            "skill_id": "db_design"
        },
        headers=mentor_headers
    )
    assert res_submit.status_code == 200
    resource_data = res_submit.json()
    assert resource_data["status"] == "PENDING"
    resource_id = resource_data["id"]
    
    # 2. Public / learner query does NOT return pending resource
    res_public = client.get(f"/api/v1/resources?q={unique_title}", headers=learner_headers)
    assert res_public.status_code == 200
    matching_titles = [r["title"] for r in res_public.json()["resources"]]
    assert unique_title not in matching_titles
    
    # 3. Non-admin cannot approve resource
    res_unauth = client.post(f"/api/v1/admin/resources/{resource_id}/approve", headers=mentor_headers)
    assert res_unauth.status_code == 403
    
    # 4. Admin approves resource
    res_approve = client.post(f"/api/v1/admin/resources/{resource_id}/approve", headers=admin_headers)
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "APPROVED"
    
    # 5. Public / learner query now returns the approved resource
    res_public_after = client.get(f"/api/v1/resources?q={unique_title}", headers=learner_headers)
    assert res_public_after.status_code == 200
    matching_titles_after = [r["title"] for r in res_public_after.json()["resources"]]
    assert unique_title in matching_titles_after
    
    # 6. Admin can edit resource
    res_edit = client.put(
        f"/api/v1/admin/resources/{resource_id}",
        json={"title": unique_title + " (Updated)"},
        headers=admin_headers
    )
    assert res_edit.status_code == 200
    assert res_edit.json()["title"] == unique_title + " (Updated)"
    
    # 7. Admin can delete resource
    res_del = client.delete(f"/api/v1/admin/resources/{resource_id}", headers=admin_headers)
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "success"
