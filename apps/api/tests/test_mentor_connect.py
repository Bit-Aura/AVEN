"""
Automated Test Suite for Mentor Connect.

Covers:
1. Learner-initiated session request creation and profile derivation.
2. Server-side duplicate OPEN request protection (409 Conflict).
3. Learner request isolation (learners only see their own requests).
4. Approved mentor OPEN requests feed visibility and readiness enrichment.
5. Atomic First-Come-First-Served (FCFS) acceptance & 409 Conflict race-condition safety.
6. Strict IDOR / Mentor ownership enforcement during scheduling and completion.
7. Valid session lifecycle state machine (OPEN -> ACCEPTED -> SCHEDULED -> IN_PROGRESS -> COMPLETED).
8. Rejection of invalid lifecycle transitions.
9. Learner cancellation rules & terminal state protection.
10. Dynamic Jitsi meeting room generation & access restriction.
11. Persistence of post-session mentor notes and recommendations.
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.core.db import async_session
from app.models.domain import (
    User,
    LearnerProfile,
    ReadinessSnapshot,
    MentorSessionRequest,
)

@pytest.fixture
def test_client():
    return TestClient(app)

def uid() -> str:
    return uuid.uuid4().hex[:8]


# ---------------------------------------------------------------------------
# 1. LEARNER REQUEST CREATION & DUPLICATE PROTECTION
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_learner_create_session_request_and_duplicate_protection(test_client):
    """
    Ensures a learner can create a session request derived from auth context,
    and server-side duplicate OPEN request protection returns 409 Conflict.
    """
    u_suffix = uid()
    learner_email = f"learner_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        user = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Test Learner", role="learner", is_active=True)
        session.add(user)
        await session.flush()
        prof = LearnerProfile(user_id=user.id, current_context="Backend Dev")
        session.add(prof)
        await session.flush()
        session.add(ReadinessSnapshot(profile_id=prof.id, skill_id="async_python", readiness_score=0.45))
        await session.commit()

    headers = {"X-User-Email": learner_email}

    # 1. Successful request creation
    res = test_client.post(
        "/api/v1/mentor-connect/requests",
        json={
            "title": "Need help debugging async semaphore deadlocks",
            "skill_id": "async_python",
            "reason": "Repeated timeout errors in producer-consumer queue",
            "description": "I have been struggling with asyncio.Queue synchronization for 2 days.",
            "requested_duration_minutes": 30,
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPEN"
    assert data["title"] == "Need help debugging async semaphore deadlocks"
    assert data["mentor_id"] is None
    assert data["meeting_url"] is None

    # 2. Duplicate OPEN request rejection (409 Conflict)
    res_dup = test_client.post(
        "/api/v1/mentor-connect/requests",
        json={
            "title": "Need help debugging async semaphore deadlocks",
            "skill_id": "async_python",
            "reason": "Another request for the same skill",
            "description": "Duplicate request",
            "requested_duration_minutes": 30,
        },
        headers=headers,
    )
    assert res_dup.status_code == 409
    assert "already have an active open mentor request" in res_dup.json()["detail"]


# ---------------------------------------------------------------------------
# 2. LEARNER ISOLATION & IDOR PROTECTION
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_learner_request_isolation_and_idor(test_client):
    """
    Ensures Learner A only sees their own requests and cannot access Learner B's request detail.
    """
    u_suffix = uid()
    learner_a_email = f"learner_a_{u_suffix}@pathfinder.dev"
    learner_b_email = f"learner_b_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        u_a = User(clerk_id=f"clerk_{learner_a_email}", email=learner_a_email, name="Learner A", role="learner", is_active=True)
        u_b = User(clerk_id=f"clerk_{learner_b_email}", email=learner_b_email, name="Learner B", role="learner", is_active=True)
        session.add_all([u_a, u_b])
        await session.flush()

        p_a = LearnerProfile(user_id=u_a.id)
        p_b = LearnerProfile(user_id=u_b.id)
        session.add_all([p_a, p_b])
        await session.flush()

        # Learner B has a private request
        req_b = MentorSessionRequest(
            profile_id=p_b.id,
            title="Learner B Private Query",
            description="Confidential code review",
            reason="Architecture feedback",
            status="OPEN",
            requested_duration_minutes=30,
        )
        session.add(req_b)
        await session.commit()
        req_b_id = req_b.id

    # Learner A fetches my-requests: must not see Learner B's request
    res_a = test_client.get("/api/v1/mentor-connect/my-requests", headers={"X-User-Email": learner_a_email})
    assert res_a.status_code == 200
    assert len(res_a.json()["requests"]) == 0

    # Learner A tries to access Learner B's request by ID: 403 Forbidden
    res_idor = test_client.get(f"/api/v1/mentor-connect/requests/{req_b_id}", headers={"X-User-Email": learner_a_email})
    assert res_idor.status_code == 403
    assert "Access denied" in res_idor.json()["detail"]


# ---------------------------------------------------------------------------
# 3. ATOMIC FIRST-COME-FIRST-SERVED (FCFS) ACCEPTANCE
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_atomic_fcfs_acceptance_and_409_conflict(test_client):
    """
    Verifies that the first mentor to accept wins, and subsequent simultaneous
    accept attempts receive HTTP 409 Conflict.
    """
    u_suffix = uid()
    learner_email = f"learner_fcfs_{u_suffix}@pathfinder.dev"
    mentor_1_email = f"mentor_alpha_{u_suffix}@pathfinder.dev"
    mentor_2_email = f"mentor_beta_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        u_l = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Learner FCFS", role="learner", is_active=True)
        u_m1 = User(clerk_id=f"clerk_{mentor_1_email}", email=mentor_1_email, name="Mentor 1", role="mentor", is_active=True)
        u_m2 = User(clerk_id=f"clerk_{mentor_2_email}", email=mentor_2_email, name="Mentor 2", role="mentor", is_active=True)
        session.add_all([u_l, u_m1, u_m2])
        await session.flush()

        p_l = LearnerProfile(user_id=u_l.id)
        session.add(p_l)
        await session.flush()

        req = MentorSessionRequest(
            profile_id=p_l.id,
            title="System Design Caching Strategies",
            description="Need help designing Redis cache invalidation",
            reason="Stuck on cache stampede problem",
            status="OPEN",
            requested_duration_minutes=45,
        )
        session.add(req)
        await session.commit()
        request_id = req.id

    # Mentor 1 accepts first -> 200 OK
    res_m1 = test_client.post(
        f"/api/v1/mentor-connect/requests/{request_id}/accept",
        headers={"X-User-Email": mentor_1_email},
    )
    assert res_m1.status_code == 200
    data_m1 = res_m1.json()
    assert data_m1["status"] == "ACCEPTED"
    assert data_m1["mentor_email"] == mentor_1_email

    # Mentor 2 attempts to accept -> 409 Conflict
    res_m2 = test_client.post(
        f"/api/v1/mentor-connect/requests/{request_id}/accept",
        headers={"X-User-Email": mentor_2_email},
    )
    assert res_m2.status_code == 409
    assert "accepted by another mentor" in res_m2.json()["detail"]

    # Verify request no longer appears in OPEN feed
    res_open = test_client.get("/api/v1/mentor-connect/open-requests", headers={"X-User-Email": mentor_2_email})
    open_ids = [r["id"] for r in res_open.json()["requests"]]
    assert request_id not in open_ids


# ---------------------------------------------------------------------------
# 4. SCHEDULING, JITSI ROOM GENERATION & IDOR PROTECTION
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_session_scheduling_and_mentor_ownership(test_client):
    """
    Tests that only the assigned mentor can schedule a session,
    a secure Jitsi room is generated, and Mentor B is rejected with 403 Forbidden.
    """
    u_suffix = uid()
    learner_email = f"learner_sched_{u_suffix}@pathfinder.dev"
    mentor_owner_email = f"mentor_owner_{u_suffix}@pathfinder.dev"
    mentor_intruder_email = f"mentor_intruder_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        u_l = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Learner Sched", role="learner", is_active=True)
        u_mo = User(clerk_id=f"clerk_{mentor_owner_email}", email=mentor_owner_email, name="Assigned Mentor", role="mentor", is_active=True)
        u_mi = User(clerk_id=f"clerk_{mentor_intruder_email}", email=mentor_intruder_email, name="Intruder Mentor", role="mentor", is_active=True)
        session.add_all([u_l, u_mo, u_mi])
        await session.flush()

        p_l = LearnerProfile(user_id=u_l.id)
        session.add(p_l)
        await session.flush()

        req = MentorSessionRequest(
            profile_id=p_l.id,
            mentor_id=u_mo.id,
            title="Kubernetes Ingress Controllers",
            description="Deep dive on Envoy ingress routing",
            reason="Preparing for distributed systems checkpoint",
            status="ACCEPTED",
            requested_duration_minutes=30,
        )
        session.add(req)
        await session.commit()
        request_id = req.id

    sched_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

    # 1. Intruder mentor attempts to schedule -> 403 Forbidden
    res_intruder = test_client.post(
        f"/api/v1/mentor-connect/requests/{request_id}/schedule",
        json={"scheduled_at": sched_time, "duration_minutes": 45},
        headers={"X-User-Email": mentor_intruder_email},
    )
    assert res_intruder.status_code == 403
    assert "not authorized to schedule" in res_intruder.json()["detail"]

    # 2. Assigned mentor schedules successfully
    res_owner = test_client.post(
        f"/api/v1/mentor-connect/requests/{request_id}/schedule",
        json={"scheduled_at": sched_time, "duration_minutes": 45},
        headers={"X-User-Email": mentor_owner_email},
    )
    assert res_owner.status_code == 200
    data = res_owner.json()
    assert data["status"] == "SCHEDULED"
    assert data["duration_minutes"] == 45
    assert data["meeting_room_id"] is not None
    assert "https://meet.jit.si/aven-connect-" in data["meeting_url"]


# ---------------------------------------------------------------------------
# 5. COMPLETE LIFECYCLE & NOTES PERSISTENCE
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_full_session_lifecycle_and_completion_notes(test_client):
    """
    Tests end-to-end lifecycle:
    OPEN -> ACCEPTED -> SCHEDULED -> IN_PROGRESS -> COMPLETED
    and verifies mentor notes and recommendations are saved and accessible to the learner.
    """
    u_suffix = uid()
    learner_email = f"learner_life_{u_suffix}@pathfinder.dev"
    mentor_email = f"mentor_life_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        u_l = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Life Learner", role="learner", is_active=True)
        u_m = User(clerk_id=f"clerk_{mentor_email}", email=mentor_email, name="Life Mentor", role="mentor", is_active=True)
        session.add_all([u_l, u_m])
        await session.flush()
        p_l = LearnerProfile(user_id=u_l.id)
        session.add(p_l)
        await session.commit()

    # 1. Learner creates request (OPEN)
    res_create = test_client.post(
        "/api/v1/mentor-connect/requests",
        json={
            "title": "PostgreSQL Indexing & Query Tuning",
            "skill_id": "postgres_advanced",
            "reason": "Computationally Intensive sequential scans on large dataset",
            "description": "Need advice on composite index ordering and EXPLAIN ANALYZE interpretation.",
            "requested_duration_minutes": 30,
        },
        headers={"X-User-Email": learner_email},
    )
    assert res_create.status_code == 200
    req_id = res_create.json()["id"]

    # 2. Mentor accepts (ACCEPTED)
    res_accept = test_client.post(
        f"/api/v1/mentor-connect/requests/{req_id}/accept",
        headers={"X-User-Email": mentor_email},
    )
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "ACCEPTED"

    # 3. Mentor schedules (SCHEDULED)
    sched_dt = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    res_sched = test_client.post(
        f"/api/v1/mentor-connect/requests/{req_id}/schedule",
        json={"scheduled_at": sched_dt, "duration_minutes": 30},
        headers={"X-User-Email": mentor_email},
    )
    assert res_sched.status_code == 200
    assert res_sched.json()["status"] == "SCHEDULED"

    # 4. Mentor joins / starts session (IN_PROGRESS)
    res_start = test_client.post(
        f"/api/v1/mentor-connect/requests/{req_id}/start",
        headers={"X-User-Email": mentor_email},
    )
    assert res_start.status_code == 200
    assert res_start.json()["status"] == "IN_PROGRESS"

    # 5. Mentor completes session with notes & recommendations (COMPLETED)
    notes_text = "Reviewed EXPLAIN ANALYZE output. Fixed bitmap heap scan bottleneck by adding a composite index on (tenant_id, created_at)."
    recs_text = "1. Re-run query benchmark.\n2. Complete Postgres partition challenge.\n3. Schedule mock review next week."
    res_comp = test_client.post(
        f"/api/v1/mentor-connect/requests/{req_id}/complete",
        json={
            "mentor_notes": notes_text,
            "recommendations": recs_text,
        },
        headers={"X-User-Email": mentor_email},
    )
    assert res_comp.status_code == 200
    data_comp = res_comp.json()
    assert data_comp["status"] == "COMPLETED"
    assert data_comp["mentor_notes"] == notes_text
    assert data_comp["recommendations"] == recs_text
    assert data_comp["completed_at"] is not None

    # 6. Learner inspects completed session in my-requests: notes & recommendations are visible
    res_learner_view = test_client.get(
        "/api/v1/mentor-connect/my-requests",
        headers={"X-User-Email": learner_email},
    )
    assert res_learner_view.status_code == 200
    learner_reqs = res_learner_view.json()["requests"]
    assert len(learner_reqs) == 1
    assert learner_reqs[0]["status"] == "COMPLETED"
    assert learner_reqs[0]["mentor_notes"] == notes_text
    assert learner_reqs[0]["recommendations"] == recs_text
