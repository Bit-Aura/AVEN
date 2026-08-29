from typing import Optional
from pydantic import BaseModel, Field, model_validator

class GoalInput(BaseModel):
    user_email: str = Field(default="demo@pathfinder.dev", description="Demo user email")
    goal_text: str = Field(..., description="Stated goal, e.g. 'I want to become a backend engineer'")
    preferred_modality: str = Field(default="project", description="video, text, or project")
    weekly_hours: float = Field(default=10.0, description="Hours per week they can commit to learning")

    @model_validator(mode="after")
    def validate_contradictions(self) -> 'GoalInput':
        text = self.goal_text.lower()
        if ("beginner" in text or "novice" in text or "no experience" in text) and ("advanced" in text or "expert" in text or "senior" in text):
            raise ValueError("Contradictory skill levels detected in goal description. Please clarify your actual experience level.")
        return self

class DiagnosticSubmitInput(BaseModel):
    session_id: int
    question_id: str
    answer: str

class SkipSimulationInput(BaseModel):
    profile_id: int
    skill_id: str

class CheckpointSubmitInput(BaseModel):
    profile_id: int
    skill_id: str
    user_answer: str

class CoachChatInput(BaseModel):
    skill_id: str
    message: str
    profile_id: Optional[int] = None

class SliderWeightsInput(BaseModel):
    profile_id: int
    speed: float = Field(default=0.5, ge=0.0, le=1.0)
    depth: float = Field(default=0.5, ge=0.0, le=1.0)
    cost: float = Field(default=0.5, ge=0.0, le=1.0)

class CareerPivotInput(BaseModel):
    profile_id: int
    role_id: str

class CertificateRequest(BaseModel):
    profile_id: int
    course_name: str
    role_id: str

class ScrapeJobsInput(BaseModel):
    source: str = Field(default="greenhouse", description="Source adapter name (e.g. 'greenhouse')")
    board_token: str = Field(..., description="Job board identifier token (e.g. 'canonical', 'stripe')")
    company_name: Optional[str] = Field(default=None, description="Optional company display name")
    limit: Optional[int] = Field(default=None, ge=1, description="Max jobs to return")

class ScrapeEventsInput(BaseModel):
    source: str = Field(default="devfolio", description="Event source adapter name (e.g. 'devfolio', 'unstop')")
    board_token: str = Field(default="all", description="Board token, category, or filter query")
    company_name: Optional[str] = Field(default=None, description="Optional organizer or sponsor display name")
    limit: Optional[int] = Field(default=None, ge=1, description="Max events to return")
