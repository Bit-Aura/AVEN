import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException

from app.main import app
from app.infrastructure.ai.gateway import (
    ClaudeRelayAdapter,
    MockAIProvider,
    CodingChallenge,
    CodeEvaluationResult
)

client = TestClient(app)

# ---------------------------------------------------------------------------
# 1. ClaudeRelayAdapter Unit Tests
# ---------------------------------------------------------------------------

def test_claude_relay_adapter_defaults():
    adapter = ClaudeRelayAdapter(
        api_key="sk-test-key",
        base_url="https://api.llmsrelay.com",
        model="claude-sonnet-5"
    )
    assert adapter.base_url == "https://api.llmsrelay.com"
    assert adapter.model == "claude-sonnet-5"
    assert adapter.is_configured is True
    assert adapter.client is not None

def test_claude_relay_adapter_unconfigured():
    adapter = ClaudeRelayAdapter(api_key="")
    assert adapter.is_configured is False
    assert adapter.client is None

@pytest.mark.asyncio
async def test_claude_relay_adapter_unconfigured_chat_raises_503():
    adapter = ClaudeRelayAdapter(api_key="")
    with pytest.raises(HTTPException) as excinfo:
        await adapter._chat("system prompt", "user prompt")
    assert excinfo.value.status_code == 503
    assert "not configured" in excinfo.value.detail

def test_claude_json_parsing_variations():
    # 1. Standard markdown fence
    fenced = '```json\n{"score": 95, "verdict": "excellent"}\n```'
    parsed = ClaudeRelayAdapter._parse_json_robust(fenced)
    assert parsed["score"] == 95

    # 2. Plain markdown fence
    plain_fenced = '```\n{"score": 80, "verdict": "good"}\n```'
    parsed2 = ClaudeRelayAdapter._parse_json_robust(plain_fenced)
    assert parsed2["score"] == 80

    # 3. Raw JSON without fences
    raw = '{"score": 70, "verdict": "good"}'
    parsed3 = ClaudeRelayAdapter._parse_json_robust(raw)
    assert parsed3["score"] == 70

    # 4. Embedded JSON with surrounding commentary
    embedded = 'Here is the evaluation result:\n{"score": 85, "verdict": "good"}\nHope this helps!'
    parsed4 = ClaudeRelayAdapter._parse_json_robust(embedded)
    assert parsed4["score"] == 85

# ---------------------------------------------------------------------------
# 2. Question Generation Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_claude_generate_coding_question_mocked():
    adapter = ClaudeRelayAdapter(api_key="sk-test-key", base_url="https://api.llmsrelay.com")
    
    mock_challenge_json = json.dumps({
        "question_id": "q_sql_basics_1",
        "title": "Optimized Customer Order Aggregator",
        "problem_statement": "Write a query processor to aggregate customer lifetime spend.",
        "skill": "SQL Relational Design",
        "difficulty": "Intermediate",
        "programming_language": "python",
        "starter_code": "def aggregate_spend(orders):\n    pass\n",
        "constraints": ["O(N) time complexity", "Orders list up to 10^5 elements"],
        "examples": [
            {"input": "orders=[{'user_id': 1, 'amount': 50}]", "output": "{1: 50}", "explanation": "Single order"}
        ],
        "expected_concepts": ["Dictionary Aggregation", "Edge-case Handling"],
        "evaluation_rubric": ["Correct sum calculation: 50%", "Linear complexity: 50%"],
        "hints": ["Use defaultdict or standard dict traversal"],
        "hidden_tests": "assert aggregate_spend([{'user_id': 1, 'amount': 50}]) == {1: 50}\n"
    })
    
    with patch.object(adapter, "_chat", new=AsyncMock(return_value=mock_challenge_json)):
        res = await adapter.generate_coding_question(
            target_role="Data Engineer",
            milestone_id="sql_basics",
            difficulty="Intermediate",
            programming_language="python"
        )
        
        assert res["question_id"] == "q_sql_basics_1"
        assert res["title"] == "Optimized Customer Order Aggregator"
        assert len(res["examples"]) == 1
        assert "Dictionary Aggregation" in res["expected_concepts"]
        assert res["programming_language"] == "python"

@pytest.mark.asyncio
async def test_claude_generate_coding_question_malformed_ai_recovery():
    adapter = ClaudeRelayAdapter(api_key="sk-test-key")
    
    with patch.object(adapter, "_chat", new=AsyncMock(return_value="NOT_VALID_JSON_AT_ALL")):
        res = await adapter.generate_coding_question(
            target_role="Backend Software Engineer",
            milestone_id="python_basics",
            programming_language="python"
        )
        
        assert "question_id" in res
        assert "starter_code" in res
        assert "def solve" in res["starter_code"]
        assert res["programming_language"] == "python"

# ---------------------------------------------------------------------------
# 3. Student Code Evaluation Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_claude_evaluate_student_code_mocked():
    adapter = ClaudeRelayAdapter(api_key="sk-test-key", base_url="https://api.llmsrelay.com")
    
    mock_eval_json = json.dumps({
        "score": 92,
        "verdict": "excellent",
        "summary": "Clean, highly idiomatic solution with optimal O(N) time complexity.",
        "correctness_score": 95,
        "reasoning_score": 90,
        "code_quality_score": 90,
        "strengths": ["Single-pass dict accumulation", "Explicit handling of negative amounts"],
        "issues": [],
        "improvements": ["Add type hints for input and return types"],
        "detailed_feedback": "Based on static code analysis, the logic correctly computes aggregation without redundant iterations.",
        "complexity_analysis": {
            "time_complexity": "O(N)",
            "space_complexity": "O(K)",
            "details": "Linear iteration over N orders, where K is the number of distinct user IDs."
        },
        "next_steps": ["Explore SQL window functions for in-database aggregation"],
        "is_passing": True,
        "evaluation_type": "ai_static_reasoning",
        "evaluation_note": "AI evaluation is based on static code analysis, semantic inspection, and algorithmic reasoning."
    })
    
    with patch.object(adapter, "_chat", new=AsyncMock(return_value=mock_eval_json)):
        res = await adapter.evaluate_student_code(
            problem_statement="Aggregate user order spend",
            submitted_code="def aggregate_spend(orders):\n    res = {}\n    for o in orders:\n        res[o['user_id']] = res.get(o['user_id'], 0) + o['amount']\n    return res",
            programming_language="python",
            target_role="Backend Engineer",
            skill_name="SQL Basics"
        )
        
        assert res["score"] == 92
        assert res["verdict"] == "excellent"
        assert res["is_passing"] is True
        assert res["evaluation_type"] == "ai_static_reasoning"
        assert "O(N)" in res["complexity_analysis"]["time_complexity"]
        assert len(res["strengths"]) == 2

@pytest.mark.asyncio
async def test_mock_provider_coding_flow():
    mock_provider = MockAIProvider()
    
    question = await mock_provider.generate_coding_question(
        target_role="Backend Software Engineer",
        milestone_id="python_basics",
        programming_language="python"
    )
    assert "question_id" in question
    assert "starter_code" in question
    assert len(question["examples"]) >= 1
    
    evaluation = await mock_provider.evaluate_student_code(
        problem_statement=question["problem_statement"],
        submitted_code="def solve(records, threshold=10):\n    return sum(x for x in records if x > 0 and x >= threshold)\n",
        programming_language="python",
        skill_name="Python Basics"
    )
    assert evaluation["score"] >= 70
    assert evaluation["is_passing"] is True
    assert evaluation["evaluation_type"] == "ai_static_reasoning"

# ---------------------------------------------------------------------------
# 4. API Endpoints Integration Tests
# ---------------------------------------------------------------------------

def test_api_generate_question_endpoint():
    response = client.post(
        "/api/v1/ide/question/generate",
        json={
            "node_id": "fastapi_microservices",
            "target_role": "Backend SWE",
            "difficulty": "Intermediate",
            "programming_language": "python"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "question_id" in data
    assert "title" in data
    assert "problem_statement" in data
    assert "starter_code" in data
    assert "constraints" in data

def test_api_get_problem_legacy_compatibility():
    response = client.get("/api/v1/ide/problem?node_id=python_basics&target_role=Software+Engineer")
    assert response.status_code == 200
    data = response.json()
    assert "description" in data or "problem_statement" in data
    assert "default_code" in data or "starter_code" in data

def test_api_evaluate_endpoint_success():
    response = client.post(
        "/api/v1/ide/evaluate",
        json={
            "node_id": "python_basics",
            "programming_language": "python",
            "submitted_code": "def solve(records, threshold=10):\n    return sum(x for x in records if x > 0 and x >= threshold)\n",
            "problem_statement": "Filter and sum valid positive records above threshold.",
            "target_role": "Backend Software Engineer",
            "skill_name": "Python Basics"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert 0 <= data["score"] <= 100
    assert "verdict" in data
    assert "complexity_analysis" in data
    assert "evaluation_type" in data
    assert data["evaluation_type"] == "ai_static_reasoning"
    assert "evaluation_note" in data

def test_api_evaluate_oversized_code_rejection():
    # 70 KB payload exceeds 64 KB limit
    oversized_code = "x = 1\n" * 15000
    response = client.post(
        "/api/v1/ide/evaluate",
        json={
            "node_id": "python_basics",
            "programming_language": "python",
            "submitted_code": oversized_code,
            "problem_statement": "Test problem"
        }
    )
    assert response.status_code == 400
    assert "exceeds maximum allowed size" in response.json()["detail"]

def test_api_evaluate_empty_code_rejection():
    response = client.post(
        "/api/v1/ide/evaluate",
        json={
            "node_id": "python_basics",
            "programming_language": "python",
            "submitted_code": "   \n  ",
            "problem_statement": "Test problem"
        }
    )
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]

def test_api_execute_endpoint_backward_compatibility():
    response = client.post(
        "/api/v1/ide/execute",
        json={
            "language": "python",
            "code": "def solve():\n    return True\n",
            "node_id": "python_basics",
            "hidden_tests": "assert solve() == True\n"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "stdout" in data
    assert "code" in data
    assert data["is_passing"] is True
