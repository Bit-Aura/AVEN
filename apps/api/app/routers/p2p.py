from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timezone
from app.core.db import get_db
from app.models.p2p import P2PQueue, P2PSession, P2PQuestion
from app.models.domain import User
from app.schemas.p2p import P2PQueueJoin, P2PQueueResponse, P2PQueueStatus, P2PSessionResponse, P2PFeedbackSubmit
import random
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/p2p", tags=["p2p"])

async def get_user_name(db: AsyncSession, clerk_id: str) -> str:
    stmt = select(User.name).where(User.clerk_id == clerk_id)
    res = await db.execute(stmt)
    name = res.scalar_one_or_none()
    if name and name.strip():
        return name
    return "Anonymous Learner"

@router.delete("/queue")
async def leave_queue(user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(P2PQueue).where(P2PQueue.user_id == user_id)
    res = await db.execute(stmt)
    queue_entry = res.scalar_one_or_none()
    if queue_entry:
        await db.delete(queue_entry)
        await db.commit()
    return {"status": "SUCCESS"}


@router.post("/queue", response_model=P2PQueueStatus)
async def join_queue(req: P2PQueueJoin, db: AsyncSession = Depends(get_db)):
    # 0. Optionally update user name
    if req.user_name and req.user_name.strip():
        from sqlalchemy import update
        stmt_u = update(User).where(User.clerk_id == req.user_id).values(name=req.user_name.strip())
        await db.execute(stmt_u)
        await db.commit()

    # 1. Clear any stuck active sessions for this user
    from sqlalchemy import update
    stmt = update(P2PSession).where(
        ((P2PSession.user1_id == req.user_id) | (P2PSession.user2_id == req.user_id)) & 
        (P2PSession.status.in_(["WAITING", "IN_PROGRESS_1", "SWAPPING", "IN_PROGRESS_2"]))
    ).values(status="COMPLETED")
    await db.execute(stmt)
    await db.commit()
    
    # Also remove them from queue if they are already there
    stmt_q = select(P2PQueue).where(P2PQueue.user_id == req.user_id)
    res_q = await db.execute(stmt_q)
    existing_queue = res_q.scalar_one_or_none()
    if existing_queue:
        await db.delete(existing_queue)
        await db.commit()

    # 2. Look for an existing person in the queue for the same topic
    stmt = select(P2PQueue).where(P2PQueue.topic == req.topic).order_by(P2PQueue.joined_at.asc()).limit(1)
    result = await db.execute(stmt)
    peer = result.scalar_one_or_none()
    
    if peer:
        if peer.user_id == req.user_id:
            # Should not happen now due to delete above, but just in case
            return P2PQueueStatus(status="WAITING", session_id=None)
            
        # Fetch 2 random questions for the topic
        from app.models.p2p import P2PQuestion
        q_stmt = select(P2PQuestion).where(P2PQuestion.topic == req.topic).order_by(func.random()).limit(2)
        q_res = await db.execute(q_stmt)
        questions = q_res.scalars().all()
        
        q1_text, q1_sol = "Discuss a complex technical challenge you've faced.", "Look for structured thinking and communication."
        q2_text, q2_sol = "Design a URL shortener.", "Look for scalability, database choices, and API design."
        
        if len(questions) >= 1:
            q1_text = questions[0].question_text
            q1_sol = questions[0].solution_guidelines
        if len(questions) >= 2:
            q2_text = questions[1].question_text
            q2_sol = questions[1].solution_guidelines
        elif len(questions) == 1:
            q2_text, q2_sol = q1_text, q1_sol
            
        # Match found! Create a session.
        session = P2PSession(
            user1_id=peer.user_id,
            user2_id=req.user_id,
            topic=req.topic,
            status="WAITING",
            question1_text=q1_text,
            question1_solution=q1_sol,
            question2_text=q2_text,
            question2_solution=q2_sol
        )
        db.add(session)
        await db.delete(peer) # Remove peer from queue
        await db.commit()
        await db.refresh(session)
        peer_name = await get_user_name(db, peer.user_id)
        return P2PQueueStatus(status="MATCHED", session_id=session.id, peer_name=peer_name)
    else:
        # Add to queue
        queue_entry = P2PQueue(user_id=req.user_id, topic=req.topic)
        db.add(queue_entry)
        await db.commit()
        return P2PQueueStatus(status="WAITING", session_id=None)

@router.get("/queue/status", response_model=P2PQueueStatus)
async def check_queue_status(user_id: str, db: AsyncSession = Depends(get_db)):
    # Check if user is in an active session
    stmt = select(P2PSession).where(
        ((P2PSession.user1_id == user_id) | (P2PSession.user2_id == user_id)) & 
        (P2PSession.status.in_(["WAITING", "IN_PROGRESS_1", "SWAPPING", "IN_PROGRESS_2"]))
    ).order_by(P2PSession.created_at.desc()).limit(1)
    
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    
    if session:
        peer_id = session.user1_id if session.user2_id == user_id else session.user2_id
        peer_name = await get_user_name(db, peer_id)
        return P2PQueueStatus(status="MATCHED", session_id=session.id, peer_name=peer_name)
    
    # Check if still in queue
    stmt_q = select(P2PQueue).where(P2PQueue.user_id == user_id)
    res_q = await db.execute(stmt_q)
    if res_q.scalar_one_or_none():
        return P2PQueueStatus(status="WAITING", session_id=None)
        
    return P2PQueueStatus(status="NOT_FOUND", session_id=None)

@router.get("/session/{session_id}", response_model=P2PSessionResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(P2PSession).where(P2PSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    user1_name = await get_user_name(db, session.user1_id)
    user2_name = await get_user_name(db, session.user2_id)
    
    # Create response manually to inject names
    response = P2PSessionResponse.model_validate(session)
    response.user1_name = user1_name
    response.user2_name = user2_name
    
    return response

@router.patch("/session/{session_id}/swap", response_model=P2PSessionResponse)
async def swap_session_roles(session_id: int, user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(P2PSession).where(P2PSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Ensure the user requesting swap is part of the session
    if session.user1_id != user_id and session.user2_id != user_id:
        raise HTTPException(status_code=403, detail="Not a participant")
        
    if session.status in ["WAITING", "IN_PROGRESS_1"]:
        session.status = "IN_PROGRESS_2"
        await db.commit()
        await db.refresh(session)
        
    # Return updated session with names
    user1_name = await get_user_name(db, session.user1_id)
    user2_name = await get_user_name(db, session.user2_id)
    
    response = P2PSessionResponse.model_validate(session)
    response.user1_name = user1_name
    response.user2_name = user2_name
    
    return response

@router.post("/session/{session_id}/feedback")
async def submit_feedback(session_id: int, req: P2PFeedbackSubmit, db: AsyncSession = Depends(get_db)):
    stmt = select(P2PSession).where(P2PSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    feedback_data = {
        "communication_score": req.communication_score,
        "technical_score": req.technical_score,
        "feedback_text": req.feedback_text,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    if req.user_id == session.user1_id:
        session.feedback_user1 = feedback_data
    elif req.user_id == session.user2_id:
        session.feedback_user2 = feedback_data
    else:
        raise HTTPException(status_code=403, detail="User not part of this session")
        
    session.status = "COMPLETED"
    if not session.completed_at:
        session.completed_at = datetime.now(timezone.utc)
        
    await db.commit()
    return {"message": "Feedback submitted successfully"}

class HistoryItem(BaseModel):
    session_id: int
    topic: str
    date: str
    peer_name: str
    role: str
    feedback_received: Optional[dict] = None

@router.get("/history", response_model=List[HistoryItem])
async def get_history(user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(P2PSession).where(
        ((P2PSession.user1_id == user_id) | (P2PSession.user2_id == user_id)) &
        (P2PSession.status == "COMPLETED")
    ).order_by(P2PSession.completed_at.desc())
    
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    
    history = []
    for s in sessions:
        is_user1 = (s.user1_id == user_id)
        peer_id = s.user2_id if is_user1 else s.user1_id
        peer_name = await get_user_name(db, peer_id)
        
        # Feedback received by the user means feedback submitted by the other peer
        feedback_received = s.feedback_user2 if is_user1 else s.feedback_user1
        
        history.append(HistoryItem(
            session_id=s.id,
            topic=s.topic,
            date=s.completed_at.isoformat() if s.completed_at else (s.created_at.isoformat() if s.created_at else ""),
            peer_name=peer_name,
            role="User 1 (Interviewer First)" if is_user1 else "User 2 (Candidate First)",
            feedback_received=feedback_received
        ))
        
    return history
