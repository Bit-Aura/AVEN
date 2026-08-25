import pytest
from app.infrastructure.ai.gateway import (
    MockAIProvider,
    AnthropicAdapter,
    AntigravityProxyAdapter,
    OllamaAdapter,
    create_ai_provider
)

@pytest.mark.asyncio
async def test_mock_ai_provider():
    provider = MockAIProvider()
    
    parsed = await provider.parse_goal("Learn Python")
    assert parsed["target_goal"] == "Learn Python"
    assert "Python Basics" in parsed["current_skills"]
    
    diagnostic = await provider.conduct_diagnostic("context", [])
    assert "question_text" in diagnostic
    assert diagnostic["target_skill"] == "FastAPI Setup"
    
    explanation = await provider.explain_decision("Python", "Intro to Python")
    assert "Mock" in explanation

def test_ollama_adapter_init():
    adapter = OllamaAdapter(base_url="http://localhost:11434", model="llama3:latest")
    assert adapter.base_url == "http://localhost:11434/v1"
    assert adapter.model == "llama3:latest"
    assert hasattr(adapter, 'parse_goal')
    assert hasattr(adapter, 'conduct_diagnostic')
    assert hasattr(adapter, 'explain_decision')
    assert hasattr(adapter, 'stakeholder_chat')
    assert hasattr(adapter, 'review_pr_code')
    assert hasattr(adapter, 'coach_chat')

def test_ollama_json_parsing():
    raw_response = '```json\n{"target_goal": "Master FastAPI", "current_skills": ["Python"], "time_budget": 3, "preferred_modality": "project", "constraints": []}\n```'
    parsed = OllamaAdapter._parse_json_robust(raw_response)
    assert parsed["target_goal"] == "Master FastAPI"

def test_anthropic_adapter_init():
    adapter = AnthropicAdapter(api_key="mock-key")
    assert adapter.api_key == "mock-key"

def test_create_ai_provider_returns_provider():
    """Test that the factory function returns a valid AIProvider instance."""
    provider = create_ai_provider()
    assert provider is not None
    assert hasattr(provider, 'parse_goal')
    assert hasattr(provider, 'conduct_diagnostic')
    assert hasattr(provider, 'explain_decision')

