"""
AI Mock Interview Router.

Provides secure endpoints for resume management, interview session lifecycle,
spoken answer submission, AI evaluation, and post-interview gap synthesis.
Strictly enforces ownership and IDOR protection.
"""
import logging
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.auth import (
    get_current_user,
    require_learner,
    require_active_user,
    UserRole,
    normalize_role,
)
from app.models.domain import (
    User,
    LearnerProfile,
    LearnerResume,
    MockInterviewSession,
    MockInterviewTurn,
)
from app.infrastructure.ai.gateway import create_ai_provider
from app.infrastructure.neo4j.client import neo4j_client
from app.services.resume_parser import (
    validate_resume_file,
    extract_resume_text,
    parse_resume_to_claims,
)
from app.services.interview_engine import (
    start_interview_session,
    process_turn_answer,
    finalize_interview_report,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/interview", tags=["AI Mock Interview"])
ai_provider = create_ai_provider()


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class ResumeResponse(BaseModel):
    id: int
    profile_id: int
    original_filename: str
    content_type: str
    raw_text: str
    parsed_data: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str

class StartInterviewRequest(BaseModel):
    target_role: Optional[str] = Field(default=None, description="Target career role (e.g. 'Backend Software Engineer')")
    interview_type: Optional[str] = Field(default="COMPREHENSIVE", description="COMPREHENSIVE | TECHNICAL | SYSTEM_DESIGN | BEHAVIORAL")
    resume_id: Optional[int] = Field(default=None, description="Optional resume ID to ground interview claims")

class TurnResponse(BaseModel):
    id: int
    turn_index: int
    category: str
    question_text: str
    expected_rubrics: Optional[List[str]] = None
    learner_answer: Optional[str] = None
    input_mode: str = "VOICE"
    answer_score: Optional[float] = None
    evaluation_data: Optional[Dict[str, Any]] = None
    detected_gap_data: Optional[Any] = None
    created_at: str

class SessionSummaryItem(BaseModel):
    id: int
    profile_id: int
    target_role: str
    interview_type: str
    status: str
    current_phase: str
    current_turn_index: int
    overall_score: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    resume_verification_score: Optional[float] = None
    confidence_score: Optional[float] = None
    created_at: str
    completed_at: Optional[str] = None

class SessionDetailResponse(BaseModel):
    id: int
    profile_id: int
    resume_id: Optional[int] = None
    target_role: str
    interview_type: str
    status: str
    current_phase: str
    current_turn_index: int
    context_snapshot: Optional[Dict[str, Any]] = None
    overall_score: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    resume_verification_score: Optional[float] = None
    confidence_score: Optional[float] = None
    feedback_summary: Optional[Dict[str, Any]] = None
    turns: List[TurnResponse] = []
    created_at: str
    completed_at: Optional[str] = None

class AnswerTurnRequest(BaseModel):
    learner_answer: str = Field(..., min_length=1, description="Verbatim answer text or transcribed speech")
    input_mode: str = Field(default="VOICE", description="VOICE | TEXT")

class AnswerTurnResponse(BaseModel):
    session_id: int
    status: str
    current_phase: Optional[str] = None
    turn_index: int
    evaluation: Optional[Dict[str, Any]] = None
    next_action: str
    next_question: Optional[Dict[str, Any]] = None
    report_summary: Optional[Dict[str, Any]] = None
    should_speak: bool = True


# ---------------------------------------------------------------------------
# Helper: Resolve Profile ID from Authenticated User
# ---------------------------------------------------------------------------

async def _get_learner_profile(current_user: User, db: AsyncSession) -> LearnerProfile:
    stmt = select(LearnerProfile).where(LearnerProfile.user_id == current_user.id)
    profile = (await db.execute(stmt)).scalars().first()
    if not profile:
        profile = LearnerProfile(user_id=current_user.id, current_context="Software Engineering Track")
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# Resume Endpoints
# ---------------------------------------------------------------------------

@router.post("/resume/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(require_learner),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads, validates, extracts text, and parses structured candidate claims from a resume.
    """
    profile = await _get_learner_profile(current_user, db)
    content = await file.read()

    # 1. Validate File
    ext = validate_resume_file(file, content)

    # 2. Extract Text
    raw_text = extract_resume_text(content, ext)

    # 3. Parse Claims via AI Gateway
    parsed_claims = await parse_resume_to_claims(raw_text, ai_provider)

    # 4. Check for existing resume and update or insert
    existing_stmt = select(LearnerResume).where(LearnerResume.profile_id == profile.id)
    resume = (await db.execute(existing_stmt)).scalars().first()

    if resume:
        resume.original_filename = file.filename or "resume.pdf"
        resume.content_type = file.content_type or "application/pdf"
        resume.raw_text = raw_text
        resume.parsed_data = parsed_claims
        resume.updated_at = datetime.now(timezone.utc)
    else:
        resume = LearnerResume(
            profile_id=profile.id,
            original_filename=file.filename or "resume.pdf",
            content_type=file.content_type or "application/pdf",
            raw_text=raw_text,
            parsed_data=parsed_claims
        )
        db.add(resume)

    await db.commit()
    await db.refresh(resume)

    return ResumeResponse(
        id=resume.id,
        profile_id=resume.profile_id,
        original_filename=resume.original_filename,
        content_type=resume.content_type,
        raw_text=resume.raw_text,
        parsed_data=resume.parsed_data,
        created_at=resume.created_at.isoformat() if resume.created_at else "",
        updated_at=resume.updated_at.isoformat() if resume.updated_at else ""
    )


@router.get("/resume", response_model=ResumeResponse)
async def get_my_resume(
    current_user: User = Depends(require_learner),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the authenticated learner's currently active parsed resume.
    """
    profile = await _get_learner_profile(current_user, db)
    stmt = select(LearnerResume).where(LearnerResume.profile_id == profile.id).order_by(desc(LearnerResume.created_at))
    resume = (await db.execute(stmt)).scalars().first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resume uploaded for this profile.")

    return ResumeResponse(
        id=resume.id,
        profile_id=resume.profile_id,
        original_filename=resume.original_filename,
        content_type=resume.content_type,
        raw_text=resume.raw_text,
        parsed_data=resume.parsed_data,
        created_at=resume.created_at.isoformat() if resume.created_at else "",
        updated_at=resume.updated_at.isoformat() if resume.updated_at else ""
    )


@router.delete("/resume", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_resume(
    current_user: User = Depends(require_learner),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes the authenticated learner's resume.
    """
    profile = await _get_learner_profile(current_user, db)
    stmt = select(LearnerResume).where(LearnerResume.profile_id == profile.id)
    resumes = (await db.execute(stmt)).scalars().all()
    for r in resumes:
        await db.delete(r)
    await db.commit()
    return None


# ---------------------------------------------------------------------------
# Interview Session Lifecycle Endpoints
# ---------------------------------------------------------------------------

@router.post("/sessions")
async def start_session(
    payload: StartInterviewRequest,
    current_user: User = Depends(require_learner),
    db: AsyncSession = Depends(get_db)
):
    """
    Starts a new AI Mock Interview session for the authenticated learner.
    """
    profile = await _get_learner_profile(current_user, db)

    # Verify resume ownership if explicitly passed
    if payload.resume_id:
        res_stmt = select(LearnerResume).where(LearnerResume.id == payload.resume_id, LearnerResume.profile_id == profile.id)
        if not (await db.execute(res_stmt)).scalars().first():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Resume does not belong to the authenticated user.")

    result = await start_interview_session(
        profile_id=profile.id,
        target_role=payload.target_role,
        interview_type=payload.interview_type or "COMPREHENSIVE",
        resume_id=payload.resume_id,
        db=db,
        ai_provider=ai_provider
    )
    return result


@router.get("/sessions", response_model=List[SessionSummaryItem])
async def list_my_sessions(
    current_user: User = Depends(require_learner),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all past and active interview sessions for the authenticated learner.
    """
    profile = await _get_learner_profile(current_user, db)
    stmt = (
        select(MockInterviewSession)
        .where(MockInterviewSession.profile_id == profile.id)
        .order_by(desc(MockInterviewSession.created_at))
    )
    sessions = (await db.execute(stmt)).scalars().all()

    return [
        SessionSummaryItem(
            id=s.id,
            profile_id=s.profile_id,
            target_role=s.target_role,
            interview_type=s.interview_type,
            status=s.status,
            current_phase=s.current_phase,
            current_turn_index=s.current_turn_index,
            overall_score=s.overall_score,
            technical_score=s.technical_score,
            communication_score=s.communication_score,
            resume_verification_score=s.resume_verification_score,
            confidence_score=s.confidence_score,
            created_at=s.created_at.isoformat() if s.created_at else "",
            completed_at=s.completed_at.isoformat() if s.completed_at else None
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session_detail(
    session_id: int,
    current_user: User = Depends(require_learner),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full interview session details with turn history.
    Strictly verifies ownership to prevent IDOR.
    """
    profile = await _get_learner_profile(current_user, db)
    stmt = (
        select(MockInterviewSession)
        .where(MockInterviewSession.id == session_id)
        .options(selectinload(MockInterviewSession.turns))
    )
    session = (await db.execute(stmt)).scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    # IDOR Check: user must own session unless admin
    if session.profile_id != profile.id and normalize_role(current_user.role) != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this interview session.")

    return SessionDetailResponse(
        id=session.id,
        profile_id=session.profile_id,
        resume_id=session.resume_id,
        target_role=session.target_role,
        interview_type=session.interview_type,
        status=session.status,
        current_phase=session.current_phase,
        current_turn_index=session.current_turn_index,
        context_snapshot=session.context_snapshot,
        overall_score=session.overall_score,
        technical_score=session.technical_score,
        communication_score=session.communication_score,
        resume_verification_score=session.resume_verification_score,
        confidence_score=session.confidence_score,
        feedback_summary=session.feedback_summary,
        turns=[
            TurnResponse(
                id=t.id,
                turn_index=t.turn_index,
                category=t.category,
                question_text=t.question_text,
                expected_rubrics=t.expected_rubrics,
                learner_answer=t.learner_answer,
                input_mode=t.input_mode,
                answer_score=t.answer_score,
                evaluation_data=t.evaluation_data,
                detected_gap_data=t.detected_gap_data,
                created_at=t.created_at.isoformat() if t.created_at else ""
            )
            for t in session.turns
        ],
        created_at=session.created_at.isoformat() if session.created_at else "",
        completed_at=session.completed_at.isoformat() if session.completed_at else None
    )


@router.post("/sessions/{session_id}/answer", response_model=AnswerTurnResponse)
async def submit_turn_answer(
    session_id: int,
    payload: AnswerTurnRequest,
    current_user: User = Depends(require_learner),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a spoken/typed answer for the active turn, evaluates with AI,
    and returns next question or completed report summary.
    """
    profile = await _get_learner_profile(current_user, db)

    result = await process_turn_answer(
        session_id=session_id,
        profile_id=profile.id,
        learner_answer=payload.learner_answer,
        input_mode=payload.input_mode or "VOICE",
        db=db,
        ai_provider=ai_provider,
        neo4j_cl=neo4j_client
    )

    return AnswerTurnResponse(
        session_id=result["session_id"],
        status=result["status"],
        current_phase=result.get("current_phase"),
        turn_index=result["turn_index"],
        evaluation=result.get("evaluation"),
        next_action=result.get("next_action", "NEXT_TOPIC"),
        next_question=result.get("next_question"),
        report_summary=result.get("report_summary"),
        should_speak=result.get("should_speak", True)
    )


@router.post("/sessions/{session_id}/complete")
async def complete_session_early(
    session_id: int,
    current_user: User = Depends(require_learner),
    db: AsyncSession = Depends(get_db)
):
    """
    Finalizes an active interview session early and computes the final report.
    """
    profile = await _get_learner_profile(current_user, db)

    stmt = select(MockInterviewSession).where(MockInterviewSession.id == session_id)
    session = (await db.execute(stmt)).scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    if session.profile_id != profile.id and normalize_role(current_user.role) != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    report = await finalize_interview_report(
        session_id=session.id,
        profile_id=session.profile_id,
        db=db,
        ai_provider=ai_provider,
        neo4j_cl=neo4j_client
    )

    return {
        "session_id": session.id,
        "status": "COMPLETED",
        "report": report
    }


@router.get("/sessions/{session_id}/report")
async def get_interview_report(
    session_id: int,
    current_user: User = Depends(require_learner),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the final synthesized report, canonical skill gaps, and learning-path changes.
    """
    profile = await _get_learner_profile(current_user, db)

    stmt = (
        select(MockInterviewSession)
        .where(MockInterviewSession.id == session_id)
        .options(selectinload(MockInterviewSession.turns))
    )
    session = (await db.execute(stmt)).scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    if session.profile_id != profile.id and normalize_role(current_user.role) != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if not session.feedback_summary:
        # Finalize if completed or has turns
        report = await finalize_interview_report(
            session_id=session.id,
            profile_id=session.profile_id,
            db=db,
            ai_provider=ai_provider,
            neo4j_cl=neo4j_client
        )
        return report

    return session.feedback_summary


@router.post("/transcribe-audio")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(require_learner),
):
    """
    Transcribes learner microphone audio recording.
    Essential for browsers like Brave or privacy setups where browser-native
    SpeechRecognition cloud service is restricted.
    """
    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio recording exceeds 25 MB limit."
        )
    
    text = await ai_provider.transcribe_audio(
        audio_bytes=audio_bytes,
        filename=file.filename or "recording.webm",
        mime_type=file.content_type or "audio/webm",
    )
    return {"text": text}
