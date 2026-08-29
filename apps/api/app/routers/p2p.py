from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.db import get_db
from app.models.p2p import P2PQueue, P2PSession
from app.models.domain import User
from app.schemas.p2p import P2PQueueJoin, P2PQueueResponse, P2PQueueStatus, P2PSessionResponse, P2PFeedbackSubmit
import random

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
            
        # Match found! Create a session.
        session = P2PSession(
            user1_id=peer.user_id,
            user2_id=req.user_id,
            topic=req.topic,
            status="WAITING",
            question1_text="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
            question1_solution="Use a hash map to store the difference and index. O(n) time and space.",
            question2_text="Given a string s, find the length of the longest substring without repeating characters.",
            question2_solution="Use a sliding window with a set or hash map to track characters. O(n) time."
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
