import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
import asyncio
import uuid
from app.main import app, ai_provider
from app.infrastructure.neo4j.client import neo4j_client
from app.core.db import async_session
from app.models.domain import User, LearnerProfile
from app.services.path_planner import generate_or_replan_path

@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client

@pytest_asyncio.fixture
async def setup_test_user(monkeypatch):
    import networkx as nx
    async def mock_build_skill_subgraph(*args, **kwargs):
        G = nx.DiGraph()
        G.add_edge("Algorithms", "System Design & Scale")
        G.add_edge("System Design & Scale", "Rust Backend")
        G.add_node("Algorithms", id="Algorithms", description="")
        G.add_node("System Design & Scale", id="System Design & Scale", description="")
        G.add_node("Rust Backend", id="Rust Backend", description="")
        return G
    monkeypatch.setattr("app.services.path_planner.build_skill_subgraph", mock_build_skill_subgraph)
    monkeypatch.setattr("app.services.graph_engine.build_skill_subgraph", mock_build_skill_subgraph)
    
    async def mock_failure_root_cause_backtrace(*args, **kwargs):
        return "System Design & Scale"
    monkeypatch.setattr("app.services.path_planner.failure_root_cause_backtrace", mock_failure_root_cause_backtrace)
    
    async with async_session() as session:
        test_email = f"journey_{uuid.uuid4().hex[:8]}@pathfinder.dev"
        user = User(clerk_id=f"test_journey_user_{uuid.uuid4().hex[:8]}", email=test_email, name="Journey Test", role="LEARNER", is_active=True)
        session.add(user)
        await session.flush()
        profile = LearnerProfile(user_id=user.id, current_context="Test Goal")
        session.add(profile)
        
        from app.models.domain import AssessmentItem
        import json
        assessment = AssessmentItem(
            title="Mock Algorithms Question",
            difficulty="beginner",
            content=json.dumps({
                "target_skill": "Algorithms",
                "question": "What is Big O notation?",
                "options": ["Space", "Time"],
                "correct_answer": "Time"
            })
        )
        session.add(assessment)
        
        await session.commit()
        return profile.id, test_email

@pytest.mark.asyncio
async def test_user_journey_flow_1_goal_to_path(async_client, setup_test_user):
    profile_id, test_email = setup_test_user
    
    # 1. New learner -> goal
    goal_res = await async_client.post("/api/v1/goal", json={
        "user_email": test_email,
        "goal_text": "I want to learn rust backend development"
    })
    
    assert goal_res.status_code == 200
    goal_data = goal_res.json()
    assert "target_goal" in goal_data.get("intent", {})
    session_id = goal_data["session_id"]
    next_question = goal_data["next_question"]
    
    # 2. Simulate 3 diagnostic turns to complete the diagnostic
    for i in range(3):
        diag_res = await async_client.post("/api/v1/diagnostic/submit", json={
            "session_id": session_id,
            "question_id": next_question["question_id"],
            "answer": "Yes"
        })
        assert diag_res.status_code == 200
        diag_data = diag_res.json()
        if diag_data["status"] == "completed":
            break
        next_question = diag_data.get("next_question", {})
    
    # 3. Learner -> Path
    path_res = await async_client.get(f"/api/v1/path/{profile_id}")
    assert path_res.status_code == 200
    path_data = path_res.json()
    
    assert "remaining_path" in path_data.get("plan", {})
    assert len(path_data["plan"]["remaining_path"]) > 0

@pytest.mark.asyncio
async def test_user_journey_flow_4_learner_fails_checkpoint(async_client, setup_test_user):
    profile_id, test_email = setup_test_user
    
    # 1. Seed a path first
    async with async_session() as db:
        await generate_or_replan_path(profile_id, "test_seeding", db, neo4j_client, ai_provider)
        await db.commit()
        
    # 2. Fetch path
    path_res = await async_client.get(f"/api/v1/path/{profile_id}")
    path_data = path_res.json()
    active_node = path_data["plan"]["active_skill"]
    
    # 3. Fail the checkpoint
    checkpoint_res = await async_client.post(f"/api/v1/checkpoint/submit", json={
        "profile_id": profile_id,
        "skill_id": active_node,
        "user_answer": "I don't know this at all"
    })
    
    assert checkpoint_res.status_code == 200
    checkpoint_data = checkpoint_res.json()
    assert checkpoint_data["is_correct"] is False
    assert checkpoint_data["detected_root_cause_prereq"] == "System Design & Scale"
    assert "updated_path" in checkpoint_data
    
    # 4. Path changes based on remediation
    replan_res = await async_client.get(f"/api/v1/path/{profile_id}")
    assert replan_res.status_code == 200

@pytest.mark.asyncio
async def test_user_journey_flow_6_ai_failure_fallback(async_client):
    goal_res = await async_client.post("/api/v1/goal", json={
        "user_email": "demo_fallback@pathfinder.dev",
        "goal_text": "I want to be a system designer"
    })
    
    assert goal_res.status_code == 200
    goal_data = goal_res.json()
    assert "session_id" in goal_data

    
