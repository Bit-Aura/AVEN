from typing import Protocol, Dict, Any, List, Optional
import logging
import json
from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field
from app.core.config import settings

logger = logging.getLogger(__name__)

class GoalIntent(BaseModel):
    target_goal: str = Field(description="The primary learning or career target of the user.")
    current_skills: List[str] = Field(default=[], description="List of skills the user claims to already possess.")
    time_budget: int = Field(default=3, description="Time budget in months to achieve the goal.")
    preferred_modality: str = Field(default="project", description="Preferred modality of learning: e.g. video, text, project.")
    constraints: List[str] = Field(default=[], description="Any user constraints, like free only, specific software.")

class DiagnosticQuestion(BaseModel):
    question_id: str = Field(description="Unique identifier for the diagnostic question.")
    question_text: str = Field(description="The question text to ask the user.")
    options: List[str] = Field(description="Multiple choice options for the user.")
    target_skill: str = Field(description="The skill node this question is testing.")

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

    async def explain_decision(self, skill_name: str, resource_title: str, decision_trace: Optional[Dict[str, Any]] = None) -> str:
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
        self.client = AsyncAnthropic(api_key=self.api_key) if self.api_key else None

    async def parse_goal(self, goal_input: str) -> Dict[str, Any]:
        if not self.client:
            logger.warning("Anthropic client not configured. Returning dummy parsed goal.")
            return {
                "target_goal": goal_input,
                "current_skills": ["Python"],
                "time_budget": 4,
                "preferred_modality": "project",
                "constraints": []
            }

        prompt = f"""
Parse the following learning or career goal input into a structured JSON representation matching the target schema.
Input: "{goal_input}"

Format your response strictly as a JSON object with the following fields:
- target_goal: string (summarizing the user's primary learning objective)
- current_skills: array of strings (any skills they mention already having)
- time_budget: integer (time budget in months they mentioned, or default to 3 if unspecified)
- preferred_modality: string (e.g. video, text, project, or default to 'project')
- constraints: array of strings (e.g. 'free', 'online', 'no-coding', or empty array if none)

Do not include any explanation or markdown formatting other than the JSON string itself.
"""
        try:
            response = await self.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1000,
                system="You are an expert curriculum assistant. You parse user intents and output only valid, schema-compliant JSON.",
                messages=[{"role": "user", "content": prompt}]
            )
            content_text = response.content[0].text.strip()
            # Handle potential markdown fence wrapping
            if content_text.startswith("```json"):
                content_text = content_text[7:]
            if content_text.endswith("```"):
                content_text = content_text[:-3]
            content_text = content_text.strip()
            
            data = json.loads(content_text)
            validated = GoalIntent(**data)
            return validated.model_dump()
        except Exception as e:
            logger.error(f"Anthropic API error in parse_goal: {e}")
            # Fallback Pydantic model dump
            return {
                "target_goal": goal_input,
                "current_skills": [],
                "time_budget": 3,
                "preferred_modality": "project",
                "constraints": [],
                "error": str(e)
            }

    async def conduct_diagnostic(self, context: str, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.client:
            logger.warning("Anthropic client not configured. Returning dummy diagnostic question.")
            return {
                "question_id": f"q_{len(history) + 1}",
                "question_text": "How comfortable are you with SQL joins and query optimization?",
                "options": ["No experience", "Can write simple SELECTs", "Can optimize complex multi-table joins"],
                "target_skill": "SQL Database Design"
            }

        prompt = f"""
Conduct a diagnostic conversation step for a learner. Review the learner's context and question/answer history.
Learner Target & Context:
"{context}"

History of previous diagnostic questions & answers:
{json.dumps(history, indent=2)}

Generate the next multiple-choice diagnostic question to assess their depth of knowledge. Target a relevant skill.
Format your response strictly as a JSON object with these fields:
- question_id: string (unique identifier e.g., 'q_2')
- question_text: string (the multiple choice question text)
- options: array of 3-4 strings (representing different levels of understanding, from beginner to advanced)
- target_skill: string (the specific skill node name from the graph being tested)

Do not include any explanation or markdown formatting.
"""
        try:
            response = await self.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1000,
                system="You are conducting a structured technical assessment diagnostic. You must output only valid, schema-compliant JSON.",
                messages=[{"role": "user", "content": prompt}]
            )
            content_text = response.content[0].text.strip()
            if content_text.startswith("```json"):
                content_text = content_text[7:]
            if content_text.endswith("```"):
                content_text = content_text[:-3]
            content_text = content_text.strip()

            data = json.loads(content_text)
            validated = DiagnosticQuestion(**data)
            return validated.model_dump()
        except Exception as e:
            logger.error(f"Anthropic API error in conduct_diagnostic: {e}")
            return {
                "question_id": f"q_{len(history) + 1}",
                "question_text": "Do you have prior experience with web app APIs?",
                "options": ["Yes, designed them", "Yes, consumed them", "No prior experience"],
                "target_skill": "API Development",
                "error": str(e)
            }

    async def explain_decision(self, skill_name: str, resource_title: str, decision_trace: Optional[Dict[str, Any]] = None) -> str:
        if not self.client:
            return f"Mock explanation: '{resource_title}' was selected to learn '{skill_name}' because it aligns with your constraints and starts with foundational prerequisites."

        trace_summary = json.dumps(decision_trace, indent=2) if decision_trace else "No decision trace provided."
        prompt = f"""
Explain to the learner in a friendly, professional tone why the resource "{resource_title}" is recommended to learn the skill "{skill_name}".
You must ground your explanation strictly in the decision trace facts provided below. Do not hallucinate or make assumptions not supported by the trace data.

Decision Trace:
{trace_summary}

Keep the explanation clear, brief (1-3 sentences), and trace-grounded.
"""
        try:
            response = await self.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=500,
                system="You explain recommendation decisions. You strictly base your explanations on the facts in the DecisionTrace.",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Anthropic API error in explain_decision: {e}")
            return f"The resource '{resource_title}' was selected to cover '{skill_name}' based on your learning preferences."


class MockAIProvider(AIProvider):
    """
    Mock implementation of the AIProvider protocol for testing.
    """
    async def parse_goal(self, goal_input: str) -> Dict[str, Any]:
        return {
            "target_goal": goal_input,
            "current_skills": ["Python Basics"],
            "time_budget": 4,
            "preferred_modality": "project",
            "constraints": []
        }

    async def conduct_diagnostic(self, context: str, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "question_id": f"q_{len(history) + 1}",
            "question_text": f"Mock question based on context: {context}",
            "options": ["Option A (Beginner)", "Option B (Intermediate)", "Option C (Advanced)"],
            "target_skill": "FastAPI Setup"
        }

    async def explain_decision(self, skill_name: str, resource_title: str, decision_trace: Optional[Dict[str, Any]] = None) -> str:
        return f"Mock decision explanation: '{resource_title}' is recommended for '{skill_name}' because it matches the requested profile context."
