import pytest
from app.infrastructure.ai.gateway import MockAIProvider, AnthropicAdapter, AntigravityProxyAdapter, create_ai_provider

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
