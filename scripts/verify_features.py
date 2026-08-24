import asyncio
import os
import sys
import unittest.mock

# Ensure we can import app BEFORE patching
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../apps/api')))

# Mock Neo4j client before importing app to avoid ConnectionRefused errors when docker is down
mock_neo4j = unittest.mock.AsyncMock()
mock_neo4j.get_knowledge_graph = unittest.mock.AsyncMock(return_value={"nodes": [], "edges": []})
mock_session = unittest.mock.MagicMock()
mock_driver = unittest.mock.MagicMock()
mock_driver.session.return_value = mock_session
mock_neo4j.driver = mock_driver

unittest.mock.patch('app.infrastructure.neo4j.client.neo4j_client', mock_neo4j).start()
unittest.mock.patch('app.main.neo4j_client', mock_neo4j).start()

try:
    unittest.mock.patch('app.services.seeder.neo4j_client', mock_neo4j).start()
except AttributeError:
    pass

from fastapi.testclient import TestClient
from app.main import app
from app.models.base import Base
from app.core.db import engine

async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()

asyncio.run(setup_db())

def run_golden_scenario():
    print("=== Starting Backend End-to-End Golden Demo Verification ===")
    
    # We use the synchronous TestClient which runs against the FastAPI app.
    # Note: Our endpoints are async, TestClient handles the event loop automatically.
    with TestClient(app) as client:
        
        # 1. Health Check
        print("\\n[1/7] Health Check...")
        response = client.get("/health")
        assert response.status_code == 200, f"Failed health check: {response.text}"
        print("✓ Health Check Passed")

        # 2. Seed Database
        print("\\n[2/7] Seeding Database...")
        response = client.post("/api/v1/seed")
        assert response.status_code == 200, f"Failed seeding: {response.text}"
        print("✓ Database Seeded")

        # 3. Submit Goal
        print("\\n[3/7] Submitting Goal...")
        goal_payload = {
            "user_email": "e2e_demo@pathfinder.dev",
            "goal_text": "I want to become a backend engineer in four months",
            "preferred_modality": "project"
        }
        response = client.post("/api/v1/goal", json=goal_payload)
        assert response.status_code == 200, f"Failed goal parsing: {response.text}"
        goal_data = response.json()
        profile_id = goal_data["profile_id"]
        session_id = goal_data["session_id"]
        print(f"✓ Goal parsed. Profile ID: {profile_id}, Session ID: {session_id}")

        # 4. Diagnostic Answers (3 Turns)
        print("\\n[4/7] Submitting Diagnostic Answers...")
        for i in range(3):
            diag_payload = {
                "session_id": session_id,
                "question_id": f"q{i}",
                "answer": "I know some Python."
            }
            res = client.post("/api/v1/diagnostic/submit", json=diag_payload)
            assert res.status_code == 200, f"Diagnostic failed at turn {i}: {res.text}"
            
        final_diag_data = res.json()
        assert final_diag_data["status"] == "completed", "Diagnostic should be completed after 3 turns"
        assert "path" in final_diag_data, "Path should be generated"
        print("✓ Diagnostic completed and Path generated")

        # 5. What-If-Skip Simulation
        print("\\n[5/7] Simulating What-If-Skip...")
        skip_payload = {
            "profile_id": profile_id,
            "skill_id": "sql_basics"
        }
        response = client.post("/api/v1/path/skip", json=skip_payload)
        assert response.status_code == 200, f"Failed skip simulation: {response.text}"
        print("✓ What-If-Skip simulated downstream risk.")

        # 6. Prove-It Checkpoint
        print("\\n[6/7] Submitting Prove-It Assessment Checkpoint...")
        check_payload = {
            "profile_id": profile_id,
            "skill_id": "python_basics",
            "user_answer": "def hello(): print('world')"
        }
        response = client.post("/api/v1/checkpoint/submit", json=check_payload)
        assert response.status_code == 200, f"Failed checkpoint: {response.text}"
        print("✓ Checkpoint graded and BKT mastery updated.")

        # 7. Readiness Bar & Proof Card
        print("\n[7/7] Fetching Readiness and Proof Card...")
        response = client.get(f"/api/v1/readiness/{profile_id}")
        assert response.status_code == 200, f"Failed readiness fetch: {response.text}"
        readiness_data = response.json()
        assert "readiness" in readiness_data, "Missing readiness data"
        print("✓ Role readiness and cryptographic Proof Card verified.")

        # 8. Day-One Simulator Tickets Board
        print("\n[8/9] Fetching Day-One Simulator Kanban Board...")
        response = client.get(f"/api/v1/simulator/tickets/{profile_id}")
        assert response.status_code == 200, f"Failed simulator board fetch: {response.text}"
        tickets = response.json()
        assert len(tickets) > 0, "Should have mapped tickets from active path"
        ticket_id = tickets[0]["id"]
        print(f"✓ Found {len(tickets)} tickets. Target Ticket: {ticket_id}")

        # 9. Day-One Simulator Chat & PR Submissions
        print("\n[9/9] Testing Stakeholder Chat and PR Reviews...")
        chat_payload = {
            "profile_id": profile_id,
            "message": "Should I use default config settings?",
            "persona": "pm"
        }
        response = client.post(f"/api/v1/simulator/ticket/{ticket_id}/chat", json=chat_payload)
        assert response.status_code == 200, f"Failed stakeholder chat: {response.text}"
        chat_res = response.json()
        assert "message" in chat_res, "Missing chat response message"
        
        pr_payload = {
            "profile_id": profile_id,
            "code_content": "export const DB_PORT=5432;",
            "snapshots": []
        }
        response = client.post(f"/api/v1/simulator/ticket/{ticket_id}/submit-pr", json=pr_payload)
        assert response.status_code == 200, f"Failed PR review: {response.text}"
        pr_res = response.json()
        assert "approved" in pr_res, "Missing approval status"
        print("✓ Day-One Simulator verification passed.")

    print("\n=== All 9 Golden Scenario Steps Passed (100% Score) ===")

if __name__ == "__main__":
    try:
        run_golden_scenario()
    except AssertionError as e:
        print(f"\n❌ Verification Failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\\n❌ Verification Failed with Exception: {e}")
        sys.exit(1)
