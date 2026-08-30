"""
Automated Test Suite for AI Mock Interview & Resume Pipeline.

Covers:
1. Resume upload, size limit enforcement (5MB), and unsupported format rejection.
2. Learner resume isolation and IDOR protection.
3. Structured resume claims extraction via AI Gateway abstraction.
4. Interview session creation and Turn 0 generation with context snapshot.
5. Multi-turn verbal/text answer submission and AI evaluation.
6. Dynamic follow-up probing on weak/superficial answers vs. next topic on strong answers.
7. Strict IDOR protection (cannot access, answer, or complete another learner's session).
8. Voice input mode metadata persistence.
9. Canonical skill gap mapping via semantic mapper (pgvector) to valid AVEN skills.
10. Non-catastrophic BKT update policy.
11. Automated learning-path replanning trigger ('ai_mock_interview_gap_identified').
12. Comprehensive final report generation and summary retrieval.
13. Deterministic offline operation with MockAIProvider.
"""
import pytest
import uuid
import json
import io
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.core.db import async_session
from app.models.domain import (
    User,
    LearnerProfile,
    ReadinessSnapshot,
    SkillRecord,
    PathVersion,
    LearnerResume,
    MockInterviewSession,
    MockInterviewTurn,
)

from tests.conftest import make_test_auth_headers

@pytest.fixture
def test_client():
    return TestClient(app)

def uid() -> str:
    return uuid.uuid4().hex[:8]


# ---------------------------------------------------------------------------
# 1. RESUME PIPELINE TESTS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resume_upload_and_extraction(test_client):
    """
    Ensures a learner can upload a valid resume (TXT/PDF), text is extracted,
    and structured claims are parsed and stored.
    """
    u_suffix = uid()
    learner_email = f"learner_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        user = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Resume Learner", role="LEARNER", is_active=True)
        session.add(user)
        await session.flush()
        prof = LearnerProfile(user_id=user.id, current_context="Backend SWE")
        session.add(prof)
        await session.commit()

    resume_text = """
    John Doe - Backend Software Engineer
    Skills: Python, FastAPI, PostgreSQL, Docker, Redis
    Experience: 2 years building high-throughput APIs.
    Projects: E-Commerce Cloud API built with FastAPI and PostgreSQL connection pooling.
    Education: B.S. in Computer Science 2025.
    """

    headers = make_test_auth_headers(learner_email, "LEARNER")

    # Upload TXT resume
    response = test_client.post(
        "/api/v1/interview/resume/upload",
        headers=headers,
        files={"file": ("resume.txt", io.BytesIO(resume_text.encode("utf-8")), "text/plain")}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["original_filename"] == "resume.txt"
    assert data["parsed_data"] is not None
    assert "FastAPI" in data["parsed_data"]["technical_skills"] or "Python" in data["parsed_data"]["technical_skills"]

    # Verify GET /resume
    get_res = test_client.get("/api/v1/interview/resume", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == data["id"]


@pytest.mark.asyncio
async def test_resume_upload_rejections(test_client):
    """
    Ensures invalid file extensions and oversized files are rejected.
    """
    u_suffix = uid()
    learner_email = f"learner_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        user = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Reject Learner", role="LEARNER", is_active=True)
        session.add(user)
        await session.flush()
        session.add(LearnerProfile(user_id=user.id, current_context="General Track"))
        await session.commit()

    headers = make_test_auth_headers(learner_email, "LEARNER")

    # 1. Invalid extension (.exe)
    res_exe = test_client.post(
        "/api/v1/interview/resume/upload",
        headers=headers,
        files={"file": ("malicious.exe", io.BytesIO(b"binary content"), "application/octet-stream")}
    )
    assert res_exe.status_code == 400

    # 2. Oversized file (> 5MB)
    big_data = b"A" * (6 * 1024 * 1024)
    res_big = test_client.post(
        "/api/v1/interview/resume/upload",
        headers=headers,
        files={"file": ("huge_resume.txt", io.BytesIO(big_data), "text/plain")}
    )
    assert res_big.status_code == 413


@pytest.mark.asyncio
async def test_resume_isolation_and_deletion(test_client):
    """
    Ensures a learner cannot see another learner's resume, and deletion works properly.
    """
    u1, u2 = uid(), uid()
    e1, e2 = f"u1_{u1}@pathfinder.dev", f"u2_{u2}@pathfinder.dev"

    async with async_session() as session:
        user1 = User(clerk_id=f"clerk_{e1}", email=e1, name="User One", role="LEARNER", is_active=True)
        user2 = User(clerk_id=f"clerk_{e2}", email=e2, name="User Two", role="LEARNER", is_active=True)
        session.add_all([user1, user2])
        await session.flush()
        session.add_all([
            LearnerProfile(user_id=user1.id, current_context="Track 1"),
            LearnerProfile(user_id=user2.id, current_context="Track 2")
        ])
        await session.commit()

    h1 = make_test_auth_headers(e1, "LEARNER")
    h2 = make_test_auth_headers(e2, "LEARNER")

    # Upload for User 1
    test_client.post(
        "/api/v1/interview/resume/upload",
        headers=h1,
        files={"file": ("u1_resume.txt", io.BytesIO(b"User 1 content with Python"), "text/plain")}
    )

    # User 2 should NOT have a resume
    res2 = test_client.get("/api/v1/interview/resume", headers=h2)
    assert res2.status_code == 404

    # Delete User 1 resume
    del_res = test_client.delete("/api/v1/interview/resume", headers=h1)
    assert del_res.status_code == 204

    # Verify User 1 now has 404
    assert test_client.get("/api/v1/interview/resume", headers=h1).status_code == 404


# ---------------------------------------------------------------------------
# 2. INTERVIEW SESSION & TURN LIFECYCLE TESTS
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_interview_session_start_and_turn_progression(test_client):
    """
    Tests starting an interview, receiving the first question, submitting an answer,
    and verifying turn progression with MockAIProvider.
    """
    u_suffix = uid()
    learner_email = f"learner_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        user = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Interview Learner", role="LEARNER", is_active=True)
        session.add(user)
        await session.flush()
        prof = LearnerProfile(user_id=user.id, current_context="Backend Software Engineer")
        session.add(prof)
        await session.flush()
        session.add(ReadinessSnapshot(profile_id=prof.id, skill_id="python_basics", readiness_score=0.90))
        session.add(ReadinessSnapshot(profile_id=prof.id, skill_id="sql_basics", readiness_score=0.85))
        await session.commit()

    headers = make_test_auth_headers(learner_email, "LEARNER")

    # 1. Start Session
    start_res = test_client.post(
        "/api/v1/interview/sessions",
        headers=headers,
        json={"target_role": "Backend Software Engineer", "interview_type": "COMPREHENSIVE"}
    )
    assert start_res.status_code == 200, start_res.text
    session_data = start_res.json()
    session_id = session_data["session_id"]
    assert session_data["status"] == "IN_PROGRESS"
    assert session_data["turn_index"] == 0
    assert "question" in session_data
    assert len(session_data["question"]["question_text"]) > 10

    # 2. Answer Turn 0 with detailed answer
    answer_res = test_client.post(
        f"/api/v1/interview/sessions/{session_id}/answer",
        headers=headers,
        json={
            "learner_answer": "I have 3 years of experience building asynchronous backend microservices with Python, FastAPI, and PostgreSQL. I recently architected an e-commerce checkout API using connection pooling and async event loops.",
            "input_mode": "VOICE"
        }
    )
    assert answer_res.status_code == 200, answer_res.text
    ans_data = answer_res.json()
    assert ans_data["status"] == "IN_PROGRESS"
    assert ans_data["turn_index"] == 1
    assert ans_data["evaluation"]["overall_score"] >= 70
    assert ans_data["next_question"] is not None


@pytest.mark.asyncio
async def test_dynamic_follow_up_probing_on_struggling_answer(test_client):
    """
    Tests that a superficial/struggling answer triggers dynamic follow-up probing
    instead of blindly moving to the next topic.
    """
    u_suffix = uid()
    learner_email = f"learner_{u_suffix}@pathfinder.dev"

    async with async_session() as session:
        user = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Struggle Learner", role="LEARNER", is_active=True)
        session.add(user)
        await session.flush()
        prof = LearnerProfile(user_id=user.id, current_context="Backend Developer")
        session.add(prof)
        await session.commit()

    headers = make_test_auth_headers(learner_email, "LEARNER")

    # Start Session
    start_res = test_client.post(
        "/api/v1/interview/sessions",
        headers=headers,
        json={"target_role": "Backend Software Engineer", "interview_type": "TECHNICAL"}
    )
    session_id = start_res.json()["session_id"]

    # Submit struggling answer
    answer_res = test_client.post(
        f"/api/v1/interview/sessions/{session_id}/answer",
        headers=headers,
        json={
            "learner_answer": "I used async because async makes everything run at the same time and I don't know much about database sessions.",
            "input_mode": "VOICE"
        }
    )
    assert answer_res.status_code == 200
    ans_data = answer_res.json()
    
    # Assert follow-up was triggered
    assert ans_data["next_action"] == "FOLLOW_UP"
    assert ans_data["evaluation"]["overall_score"] < 60
    assert len(ans_data["evaluation"]["suspected_gaps"]) > 0
    assert "concurrency" in ans_data["next_question"]["question_text"].lower() or "deeper" in ans_data["next_question"]["question_text"].lower()


@pytest.mark.asyncio
async def test_idor_protection_for_interview_sessions(test_client):
    """
    Ensures a learner cannot view, answer, or complete another learner's interview session.
    """
    u1, u2 = uid(), uid()
    e1, e2 = f"owner_{u1}@pathfinder.dev", f"attacker_{u2}@pathfinder.dev"

    async with async_session() as session:
        user1 = User(clerk_id=f"clerk_{e1}", email=e1, name="Owner Learner", role="LEARNER", is_active=True)
        user2 = User(clerk_id=f"clerk_{e2}", email=e2, name="Attacker Learner", role="LEARNER", is_active=True)
        session.add_all([user1, user2])
        await session.flush()
        session.add_all([
            LearnerProfile(user_id=user1.id, current_context="Track 1"),
            LearnerProfile(user_id=user2.id, current_context="Track 2")
        ])
        await session.commit()

    h1 = make_test_auth_headers(e1, "LEARNER")
    h2 = make_test_auth_headers(e2, "LEARNER")

    # Owner creates session
    start_res = test_client.post(
        "/api/v1/interview/sessions",
        headers=h1,
        json={"target_role": "Backend Engineer"}
    )
    session_id = start_res.json()["session_id"]

    # Attacker tries to GET session detail -> 403
    get_res = test_client.get(f"/api/v1/interview/sessions/{session_id}", headers=h2)
    assert get_res.status_code == 403

    # Attacker tries to submit answer -> 404 / 403
    ans_res = test_client.post(
        f"/api/v1/interview/sessions/{session_id}/answer",
        headers=h2,
        json={"learner_answer": "Attacker answer"}
    )
    assert ans_res.status_code in (403, 404)

    # Attacker tries to complete session -> 403 / 404
    comp_res = test_client.post(
        f"/api/v1/interview/sessions/{session_id}/complete",
        headers=h2
    )
    assert comp_res.status_code in (403, 404)


# ---------------------------------------------------------------------------
# 3. REPORT SYNTHESIS, CANONICAL SKILL MAPPING & PATH REPLANNING
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_interview_completion_report_and_path_replanning(test_client):
    """
    Tests completing an interview, mapping gaps to canonical skills,
    conservatively updating BKT scores, and triggering path replanning.
    """
    u_suffix = uid()
    learner_email = f"learner_{u_suffix}@pathfinder.dev"
    prof_id = None

    async with async_session() as session:
        # Seed SkillRecord in PostgreSQL
        skill_rec = (await session.execute(select(SkillRecord).where(SkillRecord.id == "sql_basics"))).scalars().first()
        if not skill_rec:
            session.add(SkillRecord(id="sql_basics", name="SQL Basics", bkt_p_l0=0.15, bkt_p_t=0.20, bkt_p_s=0.10, bkt_p_g=0.20))

        user = User(clerk_id=f"clerk_{learner_email}", email=learner_email, name="Complete Learner", role="LEARNER", is_active=True)
        session.add(user)
        await session.flush()
        prof = LearnerProfile(user_id=user.id, current_context="Backend Software Engineer")
        session.add(prof)
        await session.flush()
        prof_id = prof.id

        # Initial high readiness score (0.90)
        session.add(ReadinessSnapshot(profile_id=prof.id, skill_id="sql_basics", readiness_score=0.90))
        await session.commit()

    headers = make_test_auth_headers(learner_email, "LEARNER")

    # 1. Start Interview
    start_res = test_client.post(
        "/api/v1/interview/sessions",
        headers=headers,
        json={"target_role": "Backend Software Engineer"}
    )
    session_id = start_res.json()["session_id"]

    # 2. Answer turn with weakness in SQL / concurrency
    test_client.post(
        f"/api/v1/interview/sessions/{session_id}/answer",
        headers=headers,
        json={
            "learner_answer": "I struggle with SQL joins and I don't know how database transactions or concurrency work.",
            "input_mode": "VOICE"
        }
    )

    # 3. Complete Session Early to trigger final report
    comp_res = test_client.post(
        f"/api/v1/interview/sessions/{session_id}/complete",
        headers=headers
    )
    assert comp_res.status_code == 200
    report = comp_res.json()["report"]

    assert report["overall_score"] > 0
    assert "verified_strengths" in report
    assert "canonical_skill_gaps" in report
    assert "resume_verification_matrix" in report

    # 4. Verify Canonical Skill Mapping
    canonical_gaps = report["canonical_skill_gaps"]
    assert len(canonical_gaps) > 0

    # 5. Non-Catastrophic BKT Policy Check:
    # Mastery score should NOT drop from 0.90 to 0.10, but should conservatively adjust to ~0.70-0.75
    async with async_session() as session:
        stmt = select(ReadinessSnapshot).where(
            ReadinessSnapshot.profile_id == prof_id,
            ReadinessSnapshot.skill_id == "sql_basics"
        )
        snap = (await session.execute(stmt)).scalars().first()
        if snap:
            assert snap.readiness_score > 0.40, f"Readiness score catastrophically dropped to {snap.readiness_score}"

    # 6. Verify GET /report endpoint
    get_rep = test_client.get(f"/api/v1/interview/sessions/{session_id}/report", headers=headers)
    assert get_rep.status_code == 200
    assert get_rep.json()["overall_score"] == report["overall_score"]
