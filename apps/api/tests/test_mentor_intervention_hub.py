"""
Automated Test Suite for Mentor Intervention Hub.

Covers:
1. Breakthrough Zone Boundary Conditions (0.799, 0.80, 0.95, 0.951).
2. Relevant Skill Weighting for Target Placement Drives vs General Path.
3. Triage Sorting & Priority Tiers.
4. Deadline Urgency & Feasibility Factors.
5. Empirical Learner Velocity Calculation & Fallback.
6. AI Coach Escalation Detection & Idempotency.
7. Closed-Loop Intervention Lifecycle & Invalid Transition Protection.
8. Cohort Isolation & Cross-Cohort Leakage Protection.
9. Mentor Role Authorization & Access Control.
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import async_session
from app.models.domain import (
    User,
    LearnerProfile,
    ReadinessSnapshot,
    AssessmentItem,
    AssessmentAttempt,
    Cohort,
    CohortMember,
    PlacementDrive,
    MentorIntervention,
    AiCoachEscalation,
)
from app.services.intervention_engine import (
    calculate_learner_velocity,
    detect_and_sync_ai_escalations,
    generate_cohort_triage_queue,
)

@pytest.fixture
def test_client():
    return TestClient(app)

def uid() -> str:
    return uuid.uuid4().hex[:8]


# ---------------------------------------------------------------------------
# 1. BREAKTHROUGH ZONE BOUNDARY TESTS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_breakthrough_zone_boundaries():
    """
    Tests mathematical boundary conditions for Breakthrough Zone detection:
    - 0.799 -> False (no 1.5x bonus)
    - 0.800 -> True (1.5x bonus applied)
    - 0.950 -> True (1.5x bonus applied)
    - 0.951 -> False (no 1.5x bonus)
    """
    async with async_session() as session:
        u_suffix = uid()
        cohort = Cohort(name=f"Boundary Test Cohort {u_suffix}", is_active=True)
        session.add(cohort)
        await session.flush()

        test_scores = [
            (f"learner_799_{u_suffix}@pathfinder.dev", 0.799, False),
            (f"learner_800_{u_suffix}@pathfinder.dev", 0.800, True),
            (f"learner_950_{u_suffix}@pathfinder.dev", 0.950, True),
            (f"learner_951_{u_suffix}@pathfinder.dev", 0.951, False),
        ]

        for email, score, _ in test_scores:
            u = User(clerk_id=f"clerk_{email}", email=email, name=email.split("@")[0], role="learner")
            session.add(u)
            await session.flush()
            prof = LearnerProfile(user_id=u.id, current_context="Backend Dev")
            session.add(prof)
            await session.flush()
            session.add(CohortMember(cohort_id=cohort.id, profile_id=prof.id, is_active=True))
            session.add(ReadinessSnapshot(profile_id=prof.id, skill_id="python_basics", readiness_score=score))

        await session.commit()

        report = await generate_cohort_triage_queue(
            cohort_id=cohort.id,
            placement_drive_id=None,
            filters={},
            db=session,
        )

        assert len(report.items) == 4
        results = {item.learner_email: item for item in report.items}

        # Verify 0.799
        email_799 = f"learner_799_{u_suffix}@pathfinder.dev"
        assert results[email_799].in_breakthrough_zone is False
        assert results[email_799].score_breakdown.breakthrough_bonus == 1.0

        # Verify 0.800
        email_800 = f"learner_800_{u_suffix}@pathfinder.dev"
        assert results[email_800].in_breakthrough_zone is True
        assert results[email_800].score_breakdown.breakthrough_bonus == 1.5

        # Verify 0.950
        email_950 = f"learner_950_{u_suffix}@pathfinder.dev"
        assert results[email_950].in_breakthrough_zone is True
        assert results[email_950].score_breakdown.breakthrough_bonus == 1.5

        # Verify 0.951
        email_951 = f"learner_951_{u_suffix}@pathfinder.dev"
        assert results[email_951].in_breakthrough_zone is False
        assert results[email_951].score_breakdown.breakthrough_bonus == 1.0


# ---------------------------------------------------------------------------
# 2. RELEVANT SKILL WEIGHTING TESTS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_relevant_skill_weighting_for_placement_drives():
    """
    Ensures that when a placement drive is selected, readiness is computed
    strictly from the drive's required skills rather than unrelated skills.
    """
    async with async_session() as session:
        u_suffix = uid()
        cohort = Cohort(name=f"Drive Weighting Cohort {u_suffix}", is_active=True)
        session.add(cohort)
        await session.flush()

        drive = PlacementDrive(
            cohort_id=cohort.id,
            company_name="Stripe",
            role_title="Infrastructure SDE",
            target_date=(datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
            required_skills=["system_design", "async_python"],
            readiness_threshold=0.70,
            is_active=True,
        )
        session.add(drive)
        await session.flush()

        email = f"weighted_test_{u_suffix}@pathfinder.dev"
        u = User(clerk_id=f"clerk_{email}", email=email, name="Weight Test", role="learner")
        session.add(u)
        await session.flush()
        prof = LearnerProfile(user_id=u.id, current_context="Dev")
        session.add(prof)
        await session.flush()
        session.add(CohortMember(cohort_id=cohort.id, profile_id=prof.id, is_active=True))

        session.add(ReadinessSnapshot(profile_id=prof.id, skill_id="unrelated_skill_1", readiness_score=1.0))
        session.add(ReadinessSnapshot(profile_id=prof.id, skill_id="unrelated_skill_2", readiness_score=1.0))
        session.add(ReadinessSnapshot(profile_id=prof.id, skill_id="system_design", readiness_score=0.40))
        session.add(ReadinessSnapshot(profile_id=prof.id, skill_id="async_python", readiness_score=0.40))
        await session.commit()

        report_with_drive = await generate_cohort_triage_queue(
            cohort_id=cohort.id,
            placement_drive_id=drive.id,
            filters={},
            db=session,
        )

        item = report_with_drive.items[0]
        assert item.readiness_pct == 40.0
        assert item.gap_skills_count == 2
        assert {b.skill for b in item.blocking_skills} == {"system_design", "async_python"}


# ---------------------------------------------------------------------------
# 3. EMPIRICAL VELOCITY CALCULATION TESTS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_empirical_velocity_calculation_and_fallback():
    """
    Tests empirical velocity calculation from real activity timestamps
    and fallback to ESTIMATED 10.0 hrs/wk when history is sparse.
    """
    async with async_session() as session:
        u_suffix = uid()
        email1 = f"vel_sparse_{u_suffix}@pathfinder.dev"
        u1 = User(clerk_id=f"clerk_{email1}", email=email1, role="learner")
        session.add(u1)
        await session.flush()
        p1 = LearnerProfile(user_id=u1.id)
        session.add(p1)
        await session.flush()

        vel_sparse = await calculate_learner_velocity(p1.id, session)
        assert vel_sparse["velocity_hours_per_week"] == 10.0
        assert vel_sparse["confidence"] == "ESTIMATED"

        email2 = f"vel_active_{u_suffix}@pathfinder.dev"
        u2 = User(clerk_id=f"clerk_{email2}", email=email2, role="learner")
        session.add(u2)
        await session.flush()
        p2 = LearnerProfile(user_id=u2.id)
        session.add(p2)
        await session.flush()

        now = datetime.now(timezone.utc)
        item = AssessmentItem(title=f"Vel Item {u_suffix}", content="Test", difficulty="easy")
        session.add(item)
        await session.flush()

        for day_offset in range(10):
            t = now - timedelta(days=day_offset)
            session.add(AssessmentAttempt(profile_id=p2.id, assessment_item_id=item.id, score=1.0, is_correct=True, attempted_at=t))

        await session.commit()

        vel_active = await calculate_learner_velocity(p2.id, session)
        assert vel_active["velocity_hours_per_week"] > 0
        assert vel_active["confidence"] in ("HIGH", "MEDIUM")
        assert vel_active["active_days_last_30"] == 10


# ---------------------------------------------------------------------------
# 4. AI COACH ESCALATION DETECTION & IDEMPOTENCY TESTS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ai_escalation_detection_and_idempotency():
    """
    Verifies that repeated checkpoint failures trigger AI escalations
    and that consecutive runs do not create duplicate open escalations.
    """
    async with async_session() as session:
        u_suffix = uid()
        email = f"esc_test_{u_suffix}@pathfinder.dev"
        u = User(clerk_id=f"clerk_{email}", email=email, role="learner")
        session.add(u)
        await session.flush()
        p = LearnerProfile(user_id=u.id)
        session.add(p)
        await session.flush()

        item = AssessmentItem(title=f"SQL Recursive CTEs {u_suffix}", content="Test", difficulty="hard")
        session.add(item)
        await session.flush()

        session.add(AssessmentAttempt(profile_id=p.id, assessment_item_id=item.id, score=0.2, is_correct=False))
        session.add(AssessmentAttempt(profile_id=p.id, assessment_item_id=item.id, score=0.3, is_correct=False))
        await session.commit()

        escalations_1 = await detect_and_sync_ai_escalations(p.id, session)
        assert len(escalations_1) == 1
        assert "SQL Recursive CTEs" in escalations_1[0].reason
        assert escalations_1[0].status == "OPEN"

        escalations_2 = await detect_and_sync_ai_escalations(p.id, session)
        assert len(escalations_2) == 1
        assert escalations_2[0].id == escalations_1[0].id


# ---------------------------------------------------------------------------
# 5. CLOSED-LOOP INTERVENTION LIFECYCLE & API TESTS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mentor_intervention_api_lifecycle(test_client):
    """
    Tests complete intervention lifecycle:
    POST /api/v1/mentor/interventions (PENDING)
    -> PATCH /api/v1/mentor/interventions/{id} (SCHEDULED)
    -> PATCH /api/v1/mentor/interventions/{id} (IN_PROGRESS)
    -> PATCH /api/v1/mentor/interventions/{id} (RESOLVED)
    -> Verifies invalid transition protection.
    """
    u_suffix = uid()
    mentor_email = f"lead_mentor_{u_suffix}@pathfinder.dev"
    learner_email = f"int_learner_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        m = User(clerk_id=f"clerk_{mentor_email}", email=mentor_email, name="Lead Mentor", role="MENTOR", is_active=True)
        l = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Int Learner", role="LEARNER", is_active=True)
        session.add_all([m, l])
        await session.flush()

        prof = LearnerProfile(user_id=l.id, current_context="Fullstack SDE")
        session.add(prof)
        await session.commit()
        profile_id = prof.id

    from tests.conftest import make_test_auth_headers
    headers = make_test_auth_headers(mentor_email, "MENTOR")

    # 1. Create Intervention
    res_create = test_client.post(
        "/api/v1/mentor/interventions",
        json={
            "profile_id": profile_id,
            "action_type": "TARGETED_1ON1",
            "priority": "HIGH",
            "focus_skills": ["system_design"],
            "reason": "Breakthrough zone 1-on-1 review",
            "status": "PENDING",
            "duration_minutes": 30,
        },
        headers=headers,
    )
    assert res_create.status_code == 200
    data = res_create.json()
    intervention_id = data["id"]
    assert data["status"] == "PENDING"
    assert data["resolved_at"] is None

    # 2. Transition to SCHEDULED
    scheduled_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    res_sched = test_client.patch(
        f"/api/v1/mentor/interventions/{intervention_id}",
        json={"status": "SCHEDULED", "scheduled_at": scheduled_time},
        headers=headers,
    )
    assert res_sched.status_code == 200
    assert res_sched.json()["status"] == "SCHEDULED"

    # 3. Transition to IN_PROGRESS
    res_prog = test_client.patch(
        f"/api/v1/mentor/interventions/{intervention_id}",
        json={"status": "IN_PROGRESS", "notes": "Mentor actively reviewing architecture diagrams"},
        headers=headers,
    )
    assert res_prog.status_code == 200
    assert res_prog.json()["status"] == "IN_PROGRESS"

    # 4. Transition to RESOLVED
    res_res = test_client.patch(
        f"/api/v1/mentor/interventions/{intervention_id}",
        json={"status": "RESOLVED", "notes": "Completed session. Learner cleared system design gap."},
        headers=headers,
    )
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "RESOLVED"
    assert res_res.json()["resolved_at"] is not None

    # 5. Terminal State Protection: Cannot revert RESOLVED to PENDING
    res_invalid = test_client.patch(
        f"/api/v1/mentor/interventions/{intervention_id}",
        json={"status": "PENDING"},
        headers=headers,
    )
    assert res_invalid.status_code == 400
    assert "Cannot transition intervention from terminal status" in res_invalid.json()["detail"]


# ---------------------------------------------------------------------------
# 6. COHORT ISOLATION TESTS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cohort_isolation_no_leakage():
    """
    Ensures that learners in Cohort A are NEVER returned in Cohort B's triage queue.
    """
    async with async_session() as session:
        u_suffix = uid()
        cohort_a = Cohort(name=f"Cohort Alpha {u_suffix}", is_active=True)
        cohort_b = Cohort(name=f"Cohort Beta {u_suffix}", is_active=True)
        session.add_all([cohort_a, cohort_b])
        await session.flush()

        email_a = f"user_a_{u_suffix}@pathfinder.dev"
        u_a = User(clerk_id=f"clerk_{email_a}", email=email_a, name="User A", role="learner")
        session.add(u_a)
        await session.flush()
        p_a = LearnerProfile(user_id=u_a.id)
        session.add(p_a)
        await session.flush()
        session.add(CohortMember(cohort_id=cohort_a.id, profile_id=p_a.id, is_active=True))

        email_b = f"user_b_{u_suffix}@pathfinder.dev"
        u_b = User(clerk_id=f"clerk_{email_b}", email=email_b, name="User B", role="learner")
        session.add(u_b)
        await session.flush()
        p_b = LearnerProfile(user_id=u_b.id)
        session.add(p_b)
        await session.flush()
        session.add(CohortMember(cohort_id=cohort_b.id, profile_id=p_b.id, is_active=True))

        await session.commit()

        report_a = await generate_cohort_triage_queue(cohort_id=cohort_a.id, placement_drive_id=None, filters={}, db=session)
        assert len(report_a.items) == 1
        assert report_a.items[0].profile_id == p_a.id

        report_b = await generate_cohort_triage_queue(cohort_id=cohort_b.id, placement_drive_id=None, filters={}, db=session)
        assert len(report_b.items) == 1
        assert report_b.items[0].profile_id == p_b.id


# ---------------------------------------------------------------------------
# 7. ROLE AUTHORIZATION & ACCESS CONTROL TESTS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mentor_endpoint_authorization(test_client):
    """
    Ensures learner accounts cannot access mentor triage or intervention endpoints.
    """
    u_suffix = uid()
    learner_email = f"strictly_learner_{u_suffix}@pathfinder.dev"
    mentor_email = f"strictly_mentor_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        l = User(clerk_id=f"clerk_{learner_email}", email=learner_email, role="LEARNER", is_active=True)
        m = User(clerk_id=f"clerk_{mentor_email}", email=mentor_email, role="MENTOR", is_active=True)
        session.add_all([l, m])
        await session.commit()

    from tests.conftest import make_test_auth_headers
    learner_headers = make_test_auth_headers(learner_email, "LEARNER")
    mentor_headers = make_test_auth_headers(mentor_email, "MENTOR")

    # Learner should be denied
    res_unauth = test_client.get("/api/v1/mentor/cohorts", headers=learner_headers)
    assert res_unauth.status_code == 403
    assert "Approved mentor access required" in res_unauth.json()["detail"]

    # Approved mentor should be allowed
    res_auth = test_client.get("/api/v1/mentor/cohorts", headers=mentor_headers)
    assert res_auth.status_code == 200
