from typing import Protocol, Dict, Any, List, Optional
import logging
from anthropic import AsyncAnthropic
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIProvider(Protocol):
    """
    AIProvider defines the interface for communicating with LLM providers.
    """
    async def parse_goal(self, goal_input: str) -> Dict[str, Any]:
        """
        Parses a natural language goal into structured format.
        """
        ...

    async def conduct_diagnostic(self, context: str, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Conducts a diagnostic step based on user context and historical attempts.
        """
        ...

    async def explain_decision(self, skill_name: str, resource_title: str) -> str:
        """
        Generates an explanation for recommending a resource for a skill.
        """
        ...


class AnthropicAdapter(AIProvider):
    """
    Anthropic implementation of the AIProvider protocol.
    """
    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        # Instantiate AsyncAnthropic client safely
        self.client = AsyncAnthropic(api_key=self.api_key) if self.api_key else None

    async def parse_goal(self, goal_input: str) -> Dict[str, Any]:
        if not self.client:
            logger.warning("Anthropic client not configured. Returning dummy parsed goal.")
            return {"goal": goal_input, "parsed": True, "skills": []}

        # Real Anthropic SDK call example
        try:
            response = await self.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1000,
                temperature=0.0,
                system="You are an expert curriculum assistant. Output your response as a valid JSON object.",
                messages=[
                    {"role": "user", "content": f"Parse the user's learning goal: '{goal_input}' into JSON."}
                ]
            )
            # In a real environment, we'd parse this text block via instructor or json.loads
            # Here we provide the scaffolding fallback or basic parse:
            content_text = response.content[0].text
            return {"raw_response": content_text, "parsed": True}
        except Exception as e:
            logger.error(f"Anthropic API error in parse_goal: {e}")
            return {"goal": goal_input, "error": str(e)}

    async def conduct_diagnostic(self, context: str, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.client:
            logger.warning("Anthropic client not configured. Returning dummy diagnostic question.")
            return {"question": "What is your experience level?", "options": ["Beginner", "Advanced"]}

        try:
            response = await self.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1000,
                temperature=0.2,
                system="You are conducting a skill assessment. Output structured JSON.",
                messages=[
                    {"role": "user", "content": f"Context: {context}. History: {history}. Ask the next diagnostic question."}
                ]
            )
            return {"raw_response": response.content[0].text}
        except Exception as e:
            logger.error(f"Anthropic API error in conduct_diagnostic: {e}")
            return {"error": str(e)}

    async def explain_decision(self, skill_name: str, resource_title: str) -> str:
        if not self.client:
            return f"Mock explanation: '{resource_title}' directly addresses the prerequisite concepts required for '{skill_name}'."

        try:
            response = await self.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=500,
                temperature=0.0,
                messages=[
                    {"role": "user", "content": f"Explain briefly why '{resource_title}' is a great learning resource for learning '{skill_name}'."}
                ]
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic API error in explain_decision: {e}")
            return f"Error generating explanation: {e}"


class MockAIProvider(AIProvider):
    """
    Mock implementation of the AIProvider protocol for testing.
    """
    async def parse_goal(self, goal_input: str) -> Dict[str, Any]:
        return {
            "goal": goal_input,
            "parsed": True,
            "inferred_skills": ["Python Basics", "FastAPI Setup"],
            "difficulty": "Beginner"
        }

    async def conduct_diagnostic(self, context: str, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "question_id": len(history) + 1,
            "question_text": f"Mock question based on context: {context}",
            "options": ["Option A", "Option B", "Option C"]
        }

    async def explain_decision(self, skill_name: str, resource_title: str) -> str:
        return f"Mock decision explanation: '{resource_title}' is recommended for '{skill_name}' because it matches the requested profile context."
