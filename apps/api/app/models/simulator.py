from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TicketSchema(BaseModel):
    id: str = Field(..., description="Unique ticket identifier, e.g., T-101")
    title: str = Field(..., description="Short summary of the task")
    skill_id: str = Field(..., description="The associated skill ID in the DAG")
    status: str = Field(..., description="BACKLOG | TODO | IN_PROGRESS | UNDER_REVIEW | MERGED")
    description: str = Field(..., description="Extended task description detailing the problem")
    acceptance_criteria: List[str] = Field(default=[], description="Definition of done criteria")
    affected_files: List[str] = Field(default=[], description="List of target codebase files")

class SimulatorChatInput(BaseModel):
    profile_id: int = Field(..., description="User's profile ID")
    message: str = Field(..., description="User's message to the stakeholder")
    persona: str = Field(default="pm", description="pm | client")
    chat_history: Optional[List[Dict[str, Any]]] = Field(default=[], description="Prior messages in this chat session")
    ticket_context: Optional[Dict[str, Any]] = Field(default=None, description="Ticket metadata including title, description, acceptance criteria")

class SimulatorChatResponse(BaseModel):
    persona: str = Field(..., description="The replying persona")
    message: str = Field(..., description="AI response text")

class PRReviewComment(BaseModel):
    line_number: int = Field(..., description="Target line number in the file")
    file_path: str = Field(..., description="Target file name")
    comment: str = Field(..., description="Constructive criticism or instructions")
    severity: str = Field(..., description="BLOCKER | SUGGESTION | LINT")

class PRReviewResult(BaseModel):
    approved: bool = Field(..., description="Whether the PR is accepted and merged")
    general_feedback: str = Field(..., description="Overarching code review comments")
    comments: List[PRReviewComment] = Field(default=[], description="Line-by-line annotations")

class SimulatorPRInput(BaseModel):
    profile_id: int = Field(..., description="User's profile ID")
    code_content: str = Field(..., description="The updated code written in the IDE")
    snapshots: List[Dict[str, Any]] = Field(default=[], description="Telemetry sequence collected by the IDE")
    ticket_context: Optional[Dict[str, Any]] = Field(default=None, description="Ticket metadata including title, description, criteria")

