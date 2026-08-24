from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_simulation import AISimulationService

router = APIRouter(prefix="/simulator", tags=["simulator"])

class StakeholderMessage(BaseModel):
    ticket_id: str
    message: str

class PullRequestSubmission(BaseModel):
    ticket_id: str
    code_diff: str

@router.post("/stakeholder/chat")
async def chat_with_stakeholder(payload: StakeholderMessage):
    """Chat with the AI Product Manager or Client for a specific ticket."""
    response = AISimulationService.generate_stakeholder_response(
        ticket_id=payload.ticket_id,
        user_message=payload.message
    )
    return response

@router.post("/pr/submit")
async def submit_mock_pr(payload: PullRequestSubmission):
    """Submit code for mock PR review by the AI Senior Developer."""
    review = AISimulationService.generate_mock_pr_review(
        code_diff=payload.code_diff
    )
    return review
