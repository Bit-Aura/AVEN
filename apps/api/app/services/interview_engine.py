"""
AI Mock Interview Engine Service.

Orchestrates context aggregation, dynamic question/evaluation lifecycle,
evidence-based gap detection, canonical skill mapping via pgvector,
conservative BKT mastery updates, and automated learning-path replanning.
"""
import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.domain import (
    User,
    LearnerProfile,
    Goal,
    ReadinessSnapshot,
    Resource,
    AssessmentAttempt,
    CodingSandboxSubmission,
    AiCoachEscalation,
    SkillRecord,
    PathVersion,
    LearnerResume,
    MockInterviewSession,
    MockInterviewTurn,
)
from app.infrastructure.ai.gateway import AIProvider
from app.infrastructure.neo4j.client import neo4j_client, Neo4jClient
from app.services.semantic_mapper import find_relevant_skills
from app.services.path_planner import update_bkt_score, generate_or_replan_path

logger = logging.getLogger(__name__)

MAX_INTERVIEW_TURNS = 8
MAX_INTERVIEW_TURNS = 8
# Dynamic similarity thresholds are now calculated at runtime based on the top-k distribution.

# ---------------------------------------------------------------------------
# Context Builder
# ---------------------------------------------------------------------------

async def build_interview_context(
    profile_id: int,
    target_role: Optional[str],
    resume_id: Optional[int],
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Builds a compact, structured interview context snapshot combining:
    - Learner Profile & Goals
    - Mastered Skills & BKT Readiness Scores
    - Associated Course Resources
    - Recent Assessment & Coding Performance
    - Parsed Resume Claims (skills, projects, experience)
    """
    # 1. Profile & Goal
    prof_stmt = select(LearnerProfile).where(LearnerProfile.id == profile_id)
    profile = (await db.execute(prof_stmt)).scalars().first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Learner profile {profile_id} not found.")

    goal_stmt = select(Goal).where(Goal.profile_id == profile_id).order_by(desc(Goal.created_at))
    goal = (await db.execute(goal_stmt)).scalars().first()
    resolved_role = target_role or (goal.title if goal else (profile.current_context or "Backend Software Engineer"))

    # 2. Mastered & In-Progress Skills (ReadinessSnapshots)
    readiness_stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == profile_id)
    snapshots = (await db.execute(readiness_stmt)).scalars().all()
    
    skill_records = (await db.execute(select(SkillRecord))).scalars().all()
    id_to_name = {s.id: s.name for s in skill_records}

    mastered_skills = []
    developing_skills = []
    for s in snapshots:
        item = {
            "skill_id": s.skill_id,
            "skill_name": id_to_name.get(s.skill_id, s.skill_id.replace("_", " ").title()),
            "readiness_score": round(s.readiness_score, 2)
        }
        if s.readiness_score >= 0.70:
            mastered_skills.append(item)
        else:
            developing_skills.append(item)

    # 3. Associated Course Resources
    completed_skill_ids = [m["skill_id"] for m in mastered_skills[:6]]
    resources_list = []
    if completed_skill_ids:
        res_stmt = select(Resource).where(Resource.skill_id.in_(completed_skill_ids)).limit(6)
        resources = (await db.execute(res_stmt)).scalars().all()
        for r in resources:
            resources_list.append({
                "title": r.title,
                "skill_id": r.skill_id,
                "resource_type": r.resource_type
            })

    # 4. Recent Coding Submissions & Assessments
    code_stmt = select(CodingSandboxSubmission).where(CodingSandboxSubmission.profile_id == profile_id).order_by(desc(CodingSandboxSubmission.created_at)).limit(3)
    coding_submissions = (await db.execute(code_stmt)).scalars().all()
    coding_evidence = [
        {"node_id": c.node_id, "score": c.score, "verdict": c.verdict, "is_passing": c.is_passing}
        for c in coding_submissions
    ]

    attempt_stmt = select(AssessmentAttempt).where(AssessmentAttempt.profile_id == profile_id).order_by(desc(AssessmentAttempt.attempted_at)).limit(3)
    attempts = (await db.execute(attempt_stmt)).scalars().all()
    assessment_evidence = [
        {"score": a.score, "is_correct": a.is_correct}
        for a in attempts
    ]

    # 5. Resume Claims
    resume_data = {}
    if resume_id:
        res_stmt = select(LearnerResume).where(LearnerResume.id == resume_id, LearnerResume.profile_id == profile_id)
        resume_record = (await db.execute(res_stmt)).scalars().first()
        if resume_record and resume_record.parsed_data:
            resume_data = resume_record.parsed_data
    else:
        # Fallback to latest resume if available
        latest_res_stmt = select(LearnerResume).where(LearnerResume.profile_id == profile_id).order_by(desc(LearnerResume.created_at))
        latest_resume = (await db.execute(latest_res_stmt)).scalars().first()
        if latest_resume and latest_resume.parsed_data:
            resume_data = latest_resume.parsed_data

    return {
        "profile_id": profile_id,
        "target_role": resolved_role,
        "mastered_skills": mastered_skills[:8],
        "developing_skills": developing_skills[:5],
        "completed_resources": resources_list,
        "coding_evidence": coding_evidence,
        "assessment_evidence": assessment_evidence,
        "resume_skills": resume_data.get("technical_skills", []),
        "resume_projects": resume_data.get("projects", []),
        "resume_experience": resume_data.get("work_experience", []),
        "resume_education": resume_data.get("education", [])
    }


# ---------------------------------------------------------------------------
# Session & Turn Lifecycle
# ---------------------------------------------------------------------------

async def start_interview_session(
    profile_id: int,
    target_role: Optional[str],
    interview_type: str,
    resume_id: Optional[int],
    db: AsyncSession,
    ai_provider: AIProvider
) -> Dict[str, Any]:
    """
    Initializes a new Mock Interview session:
    1. Aggregates learner context snapshot.
    2. Generates initial question via AI Gateway.
    3. Persists Session and Turn 0 in database.
    """
    context_snapshot = await build_interview_context(profile_id, target_role, resume_id, db)
    resolved_role = context_snapshot["target_role"]

    session = MockInterviewSession(
        profile_id=profile_id,
        resume_id=resume_id,
        target_role=resolved_role,
        interview_type=interview_type or "COMPREHENSIVE",
        status="IN_PROGRESS",
        current_phase="INTRODUCTION",
        current_turn_index=0,
        context_snapshot=context_snapshot,
        started_at=datetime.now(timezone.utc)
    )
    db.add(session)
    await db.flush()

    # Generate First Question
    q_data = await ai_provider.generate_interview_question(
        context=context_snapshot,
        conversation_history=[],
        current_phase="INTRODUCTION"
    )

    turn_0 = MockInterviewTurn(
        session_id=session.id,
        turn_index=0,
        category=q_data.get("category", "INTRODUCTION"),
        question_text=q_data.get("question_text", f"Welcome! Could you introduce yourself and describe your technical background for the {resolved_role} role?"),
        expected_rubrics=q_data.get("expected_rubrics", ["Clear self-introduction", "Relevant technical projects"]),
        input_mode="VOICE"
    )
    db.add(turn_0)
    await db.commit()
    await db.refresh(session)
    await db.refresh(turn_0)

    return {
        "session_id": session.id,
        "status": session.status,
        "target_role": session.target_role,
        "current_phase": session.current_phase,
        "turn_index": 0,
        "question": {
            "id": turn_0.id,
            "turn_index": 0,
            "category": turn_0.category,
            "question_text": turn_0.question_text,
            "should_speak": True
        }
    }


async def process_turn_answer(
    session_id: int,
    profile_id: int,
    learner_answer: str,
    input_mode: str,
    db: AsyncSession,
    ai_provider: AIProvider,
    neo4j_cl: Optional[Neo4jClient] = None
) -> Dict[str, Any]:
    """
    Processes a learner's verbal/text response for the active turn:
    1. Validates ownership and session status.
    2. Persists learner answer and input mode.
    3. Calls AI Gateway to evaluate answer against context & history.
    4. Decides follow-up vs. next topic vs. completion.
    5. Persists evaluation metrics and creates next turn or finalizes report.
    """
    clean_answer = str(learner_answer).strip()
    if not clean_answer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Answer text cannot be empty.")

    # 1. Fetch Session
    stmt = (
        select(MockInterviewSession)
        .where(MockInterviewSession.id == session_id, MockInterviewSession.profile_id == profile_id)
        .options(selectinload(MockInterviewSession.turns))
    )
    session = (await db.execute(stmt)).scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found or unauthorized.")

    if session.status != "IN_PROGRESS":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Interview session is already {session.status.lower()}.")

    # 2. Get active turn
    current_turn = None
    for t in session.turns:
        if t.turn_index == session.current_turn_index:
            current_turn = t
            break

    if not current_turn:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Turn index {session.current_turn_index} not found.")

    current_turn.learner_answer = clean_answer
    current_turn.input_mode = "VOICE" if str(input_mode).upper() == "VOICE" else "TEXT"

    # 3. Assemble Conversation History
    history = []
    for t in session.turns:
        if t.turn_index < session.current_turn_index and t.learner_answer:
            history.append({
                "turn": t.turn_index,
                "category": t.category,
                "question": t.question_text,
                "answer": t.learner_answer,
                "score": t.answer_score
            })

    # 4. Evaluate with AI Gateway
    eval_result = await ai_provider.evaluate_interview_answer(
        question=current_turn.question_text,
        answer=clean_answer,
        context=session.context_snapshot or {},
        conversation_history=history,
        current_phase=session.current_phase,
        turn_index=session.current_turn_index
    )

    eval_data = eval_result.get("answer_evaluation", {})
    current_turn.evaluation_data = eval_data
    current_turn.answer_score = float(eval_data.get("overall_score", 75.0))
    current_turn.detected_gap_data = eval_data.get("suspected_gaps", [])

    # 5. Update Aggregate Session Scores
    scored_turns = [t for t in session.turns if t.answer_score is not None]
    if scored_turns:
        session.overall_score = round(sum(t.answer_score for t in scored_turns) / len(scored_turns), 1)

    next_action = str(eval_result.get("next_action", "NEXT_TOPIC")).upper()
    next_phase = eval_result.get("next_phase", session.current_phase)
    next_question_text = eval_result.get("next_question", "")

    # Check if max turns reached
    is_at_limit = (session.current_turn_index + 1) >= MAX_INTERVIEW_TURNS

    if next_action == "COMPLETE" or is_at_limit:
        # Mark Completed & Finalize Report
        session.status = "COMPLETED"
        session.completed_at = datetime.now(timezone.utc)
        await db.commit()

        # Run final report synthesis & path replanning
        final_report = await finalize_interview_report(
            session_id=session.id,
            profile_id=profile_id,
            db=db,
            ai_provider=ai_provider,
            neo4j_cl=neo4j_cl
        )

        return {
            "session_id": session.id,
            "status": "COMPLETED",
            "turn_index": session.current_turn_index,
            "evaluation": eval_data,
            "next_action": "COMPLETE",
            "report_summary": final_report,
            "should_speak": False
        }
    else:
        # Advance to next turn
        session.current_turn_index += 1
        session.current_phase = next_phase

        next_turn = MockInterviewTurn(
            session_id=session.id,
            turn_index=session.current_turn_index,
            category=next_phase,
            question_text=next_question_text or "Could you elaborate on your experience with system error handling?",
            expected_rubrics=[],
            input_mode="VOICE"
        )
        db.add(next_turn)
        await db.commit()
        await db.refresh(next_turn)

        return {
            "session_id": session.id,
            "status": "IN_PROGRESS",
            "current_phase": session.current_phase,
            "turn_index": session.current_turn_index,
            "evaluation": eval_data,
            "next_action": next_action,
            "next_question": {
                "id": next_turn.id,
                "turn_index": next_turn.turn_index,
                "category": next_turn.category,
                "question_text": next_turn.question_text,
                "should_speak": True
            }
        }


# ---------------------------------------------------------------------------
# Final Report & Learning Path Integration
# ---------------------------------------------------------------------------

async def finalize_interview_report(
    session_id: int,
    profile_id: int,
    db: AsyncSession,
    ai_provider: AIProvider,
    neo4j_cl: Optional[Neo4jClient] = None
) -> Dict[str, Any]:
    """
    Synthesizes the final interview report:
    1. Synthesizes overall performance, verified strengths, and raw gap feedback.
    2. Maps technical gaps to CANONICAL AVEN skill IDs using semantic_mapper (pgvector).
    3. Applies non-catastrophic BKT readiness updates for validated repeated gaps.
    4. Triggers path_planner.generate_or_replan_path to update the personalized learning DAG.
    5. Persists feedback summary on the MockInterviewSession.
    """
    stmt = (
        select(MockInterviewSession)
        .where(MockInterviewSession.id == session_id, MockInterviewSession.profile_id == profile_id)
        .options(selectinload(MockInterviewSession.turns))
    )
    session = (await db.execute(stmt)).scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    turns_data = []
    for t in session.turns:
        turns_data.append({
            "turn_index": t.turn_index,
            "category": t.category,
            "question_text": t.question_text,
            "learner_answer": t.learner_answer or "",
            "answer_score": t.answer_score,
            "evaluation_data": t.evaluation_data or {},
            "detected_gap_data": t.detected_gap_data or []
        })

    # 1. AI Synthesis
    synth_report = await ai_provider.synthesize_interview_report(
        session_context=session.context_snapshot or {},
        all_turns=turns_data
    )

    # 2. Map Gaps to Canonical AVEN Skills via semantic_mapper
    raw_gaps = synth_report.get("skill_gaps", [])
    canonical_gaps = []
    validated_skill_ids = set()

    for gap in raw_gaps:
        desc_text = gap.get("description", "")
        if not desc_text:
            continue

        matched_skills = await find_relevant_skills(
            intent=desc_text,
            db_session=db,
            ai_provider=ai_provider,
            neo4j_client=neo4j_cl or neo4j_client
        )

        best_match = None
        if matched_skills:
            best_match = matched_skills[0]
            
            # Calculate dynamic threshold for canonical skill mapping
            dynamic_threshold = 0.25
            if len(matched_skills) > 1:
                similarities = [m.get("similarity", 0.0) for m in matched_skills]
                mean_sim = sum(similarities) / len(similarities)
                dynamic_threshold = max(0.20, mean_sim + 0.05) # Need to be better than average
                
            if best_match.get("similarity", 0.0) < dynamic_threshold:
                best_match = None

        if best_match:
            canonical_gaps.append({
                "canonical_skill_id": best_match["id"],
                "canonical_skill_name": best_match["name"],
                "similarity": best_match["similarity"],
                "description": desc_text,
                "confidence": gap.get("confidence", 0.75),
                "severity": gap.get("severity", "MEDIUM"),
                "evidence": gap.get("evidence", "")
            })
            validated_skill_ids.add(best_match["id"])
        else:
            # Keep as qualitative feedback without corrupting canonical skill readiness
            canonical_gaps.append({
                "canonical_skill_id": None,
                "canonical_skill_name": "General Technical Competency",
                "similarity": 0.0,
                "description": desc_text,
                "confidence": gap.get("confidence", 0.5),
                "severity": gap.get("severity", "LOW"),
                "evidence": gap.get("evidence", "")
            })

    # 3. Non-Catastrophic BKT Policy
    # Only apply BKT updates for validated canonical skills with confidence >= 0.70
    updated_bkt_skills = {}
    for cg in canonical_gaps:
        sid = cg.get("canonical_skill_id")
        conf = cg.get("confidence", 0.0)
        if sid and conf >= 0.70:
            try:
                # Update BKT score with is_correct=False (conservative mathematical adjustment)
                new_score = await update_bkt_score(
                    profile_id=profile_id,
                    skill_id=sid,
                    is_correct=False,
                    db=db,
                    neo4j_client=neo4j_cl or neo4j_client
                )
                updated_bkt_skills[sid] = new_score
            except Exception as e:
                logger.warning(f"Could not apply BKT update for skill '{sid}': {e}")

    # 4. Trigger Existing Learning Path Replanning
    new_path_version = None
    try:
        new_path_version = await generate_or_replan_path(
            profile_id=profile_id,
            trigger_event="ai_mock_interview_gap_identified",
            db=db,
            neo4j_client=neo4j_cl or neo4j_client,
            ai_provider=ai_provider
        )
    except Exception as e:
        logger.error(f"Path replanning failed post-interview: {e}")

    # 5. Store Final Summary on Session
    final_feedback = {
        "overall_score": synth_report.get("overall_score", session.overall_score or 75.0),
        "technical_score": synth_report.get("technical_score", 70.0),
        "communication_score": synth_report.get("communication_score", 80.0),
        "resume_verification_score": synth_report.get("resume_verification_score", 70.0),
        "confidence_score": synth_report.get("confidence_score", 75.0),
        "verified_strengths": synth_report.get("verified_strengths", []),
        "development_areas": synth_report.get("development_areas", []),
        "canonical_skill_gaps": canonical_gaps,
        "resume_verification_matrix": synth_report.get("resume_verification_matrix", []),
        "updated_bkt_skills": updated_bkt_skills,
        "path_version_id": new_path_version.id if new_path_version else None,
        "path_changed_nodes": new_path_version.changed_nodes if new_path_version else None,
        "summary": synth_report.get("summary", "Interview completed.")
    }

    session.overall_score = final_feedback["overall_score"]
    session.technical_score = final_feedback["technical_score"]
    session.communication_score = final_feedback["communication_score"]
    session.resume_verification_score = final_feedback["resume_verification_score"]
    session.confidence_score = final_feedback["confidence_score"]
    session.feedback_summary = final_feedback
    session.status = "COMPLETED"

    await db.commit()
    await db.refresh(session)

    return final_feedback
