from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

class P2PQueueJoin(BaseModel):
    user_id: str
    topic: str
    user_name: Optional[str] = None

class P2PQueueResponse(BaseModel):
    id: int
    user_id: str
    topic: str
    joined_at: datetime
    status: str

    class Config:
        from_attributes = True

class P2PSessionResponse(BaseModel):
    id: int
    user1_id: str
    user2_id: str
    user1_name: Optional[str] = None
    user2_name: Optional[str] = None
    topic: str
    status: str
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    question1_text: Optional[str] = None
    question1_solution: Optional[str] = None
    question2_text: Optional[str] = None
    question2_solution: Optional[str] = None

    class Config:
        from_attributes = True

class P2PFeedbackSubmit(BaseModel):
    user_id: str # Who is submitting
    communication_score: int
    technical_score: int
    feedback_text: str

class P2PQueueStatus(BaseModel):
    status: str
    session_id: Optional[int] = None
    peer_name: Optional[str] = None
