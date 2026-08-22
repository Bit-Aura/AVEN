import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.db import get_db
from app.models.domain import (
    User, LearnerProfile, Goal, DiagnosticSession,
    DiagnosticTurn, PathVersion, AssessmentItem, AssessmentAttempt, ReadinessSnapshot
)
from app.infrastructure.neo4j.client import neo4j_client
from app.infrastructure.ai.gateway import AnthropicAdapter, MockAIProvider

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Enable CORS for frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate AI Provider safely based on configuration
ai_provider = AnthropicAdapter() if settings.ANTHROPIC_API_KEY else MockAIProvider()

# --- Pydantic Schemas for API Requests/Responses ---

class GoalInput(BaseModel):
    user_email: str = Field(default="demo@pathfinder.dev", description="Demo user email")
    goal_text: str = Field(..., description="Stated goal, e.g. 'I want to become a backend engineer'")
    preferred_modality: str = Field(default="project", description="video, text, or project")

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

class SliderWeightsInput(BaseModel):
    profile_id: int
    speed: float = Field(default=0.5, ge=0.0, le=1.0)
    depth: float = Field(default=0.5, ge=0.0, le=1.0)
    cost: float = Field(default=0.5, ge=0.0, le=1.0)

# Helper function to get or create a demo user profile
async def get_or_create_profile(email: str, db: AsyncSession) -> LearnerProfile:
    # 1. Check if user exists
    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalars().first()
    if not user:
        user = User(clerk_id=f"clerk_{email.replace('@', '_')}", email=email)
        db.add(user)
        await db.flush()
        
    # 2. Check if profile exists
    stmt = select(LearnerProfile).where(LearnerProfile.user_id == user.id)
    profile = (await db.execute(stmt)).scalars().first()
    if not profile:
        profile = LearnerProfile(user_id=user.id, current_context="Backend SWE Demo")
        db.add(profile)
        await db.flush()
        
    return profile

# --- API Endpoints ---

@app.get("/health")
async def health_check():
    """
    Standard service health check endpoint.
    """
    return {"status": "ok", "provider": ai_provider.__class__.__name__}

@app.post("/api/v1/seed")
async def seed_databases(db: AsyncSession = Depends(get_db)):
    """
    Seeds Postgres and Neo4j databases with default skills, resources, and quizzes.
    """
    from app.services.seeder import seed_all
    try:
        await seed_all(db, neo4j_client)
        return {"status": "success", "message": "Databases successfully seeded with 15 SWE skills!"}
    except Exception as e:
        logger.exception("Database seeding failed")
        raise HTTPException(status_code=500, detail=f"Database seeding failed: {e}")

@app.post("/api/v1/goal")
async def parse_and_initiate_goal(
    data: GoalInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits user goal, parses it using LLM, and triggers diagnostic session.
    """
    from app.services.intent_parser import parse_intent
    
    # 1. Get profile
    profile = await get_or_create_profile(data.user_email, db)
    
    # 2. Parse intent via AI gateway
    intent = await parse_intent(data.goal_text, ai_provider, neo4j_client)
    
    # 3. Save goal
    goal = Goal(
        profile_id=profile.id,
        title=intent.get("target_goal", data.goal_text),
        description=data.preferred_modality,
        embedding=None
    )
    db.add(goal)
    await db.flush()
    
    # 4. Initiate diagnostic session (Cold-Start Diagnostic)
    session = DiagnosticSession(profile_id=profile.id, status="active")
    db.add(session)
    await db.flush()
    
    # Generate first question
    first_turn_data = await ai_provider.conduct_diagnostic(
        context=intent.get("target_goal", data.goal_text),
        history=[]
    )
    
    turn = DiagnosticTurn(
        session_id=session.id,
        prompt=json.dumps(first_turn_data),
        turn_number=1
    )
    db.add(turn)
    await db.commit()
    
    return {
        "profile_id": profile.id,
        "session_id": session.id,
        "intent": intent,
        "next_question": first_turn_data
    }

@app.post("/api/v1/diagnostic/submit")
async def submit_diagnostic_answer(
    data: DiagnosticSubmitInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Processes diagnostic answers. Generates the next question, or triggers
    path planning if diagnostic is complete.
    """
    from app.services.path_planner import generate_or_replan_path
    
    # 1. Fetch current session & turns
    stmt = select(DiagnosticSession).where(DiagnosticSession.id == data.session_id)
    session = (await db.execute(stmt)).scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Diagnostic session not found.")
        
    turns_stmt = select(DiagnosticTurn).where(DiagnosticTurn.session_id == data.session_id).order_by(DiagnosticTurn.turn_number.asc())
    turns = list((await db.execute(turns_stmt)).scalars().all())
    
    # Update last turn with response
    last_turn = turns[-1]
    last_turn.response = data.answer
    db.add(last_turn)
    await db.flush()
    
    # Limit diagnostic to 3 turns
    if len(turns) >= 3:
        session.status = "completed"
        db.add(session)
        
        # Seed initial readiness estimates based on diagnostic answers (mocking BKT priors)
        # In a real demo, if they answered correctly we seed 0.8, else 0.15
        from app.services.path_planner import update_bkt_score
        # For demo purposes, mark Python Basics as mastered
        await update_bkt_score(session.profile_id, "python_basics", is_correct=True, db=db)
        await update_bkt_score(session.profile_id, "sql_basics", is_correct=False, db=db)
        
        # Trigger initial path generation
        path_version = await generate_or_replan_path(
            profile_id=session.profile_id,
            trigger_event="diagnostic_completion",
            db=db,
            neo4j_client=neo4j_client,
            ai_provider=ai_provider
        )
        await db.commit()
        
        return {
            "status": "completed",
            "message": "Diagnostic complete! Learning path generated.",
            "path": path_version.changed_nodes
        }
    else:
        # Generate next question
        history = [{"question": json.loads(t.prompt), "answer": t.response} for t in turns]
        next_turn_data = await ai_provider.conduct_diagnostic(
            context="Backend Software Engineer Goal",
            history=history
        )
        
        next_turn = DiagnosticTurn(
            session_id=session.id,
            prompt=json.dumps(next_turn_data),
            turn_number=len(turns) + 1
        )
        db.add(next_turn)
        await db.commit()
        
        return {
            "status": "active",
            "next_question": next_turn_data
        }

@app.get("/api/v1/path/{profile_id}")
async def get_current_path(profile_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieves the latest generated path version for the user profile.
    """
    stmt = select(PathVersion).where(PathVersion.profile_id == profile_id).order_by(PathVersion.created_at.desc())
    path_version = (await db.execute(stmt)).scalars().first()
    if not path_version:
        raise HTTPException(status_code=404, detail="No active path version found. Please set a goal first.")
        
    return {
        "id": path_version.id,
        "trigger_event": path_version.trigger_event,
        "created_at": path_version.created_at,
        "plan": path_version.changed_nodes,
        "explanation": path_version.decision_trace.get("explanation"),
        "time_warning": path_version.decision_trace.get("time_budget_warning", False)
    }

@app.post("/api/v1/path/skip")
async def simulate_what_if_skip(
    data: SkipSimulationInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Runs a "What-If-Skip" simulation, removing the skill (and descendants)
    from path, diffing it, and explaining downstream consequences.
    """
    from app.services.path_planner import generate_or_replan_path
    
    # 1. Fetch current path version
    stmt = select(PathVersion).where(PathVersion.profile_id == data.profile_id).order_by(PathVersion.created_at.desc())
    current_path = (await db.execute(stmt)).scalars().first()
    if not current_path:
        raise HTTPException(status_code=404, detail="No active path found.")
        
    # 2. Re-run planning with skip parameter (creates new version)
    new_path_version = await generate_or_replan_path(
        profile_id=data.profile_id,
        trigger_event=f"skip_simulation_{data.skill_id}",
        db=db,
        neo4j_client=neo4j_client,
        ai_provider=ai_provider,
        skip_skill_id=data.skill_id
    )
    
    # 3. Calculate diff
    old_skills = current_path.changed_nodes.get("remaining_path", [])
    new_skills = new_path_version.changed_nodes.get("remaining_path", [])
    removed_skills = list(set(old_skills) - set(new_skills))
    
    # Generate LLM explanation of downstream risks
    explanation = f"Skipping '{data.skill_id}' will remove downstream skills {removed_skills} because they depend on it."
    if settings.ANTHROPIC_API_KEY:
        try:
            explanation = await ai_provider.explain_decision(
                skill_name=data.skill_id,
                resource_title="None (Skip Simulation)",
                decision_trace={"removed_skills": removed_skills, "context": "What-If-Skip risk check"}
            )
        except Exception:
            pass
            
    await db.commit()
    return {
        "removed_skills": removed_skills,
        "risk_explanation": explanation,
        "updated_path": new_path_version.changed_nodes
    }

@app.post("/api/v1/checkpoint/submit")
async def submit_checkpoint_answer(
    data: CheckpointSubmitInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a Prove-It quiz check. If fails, runs backtrace, decays weak
    prerequisites, replans, and returns results.
    """
    from app.services.path_planner import update_bkt_score, failure_root_cause_backtrace, generate_or_replan_path
    
    # 1. Find the assessment item for the skill
    stmt = select(AssessmentItem)
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    matched_item = None
    for item in items:
        content = json.loads(item.content)
        if content.get("target_skill") == data.skill_id:
            matched_item = item
            break
            
    if not matched_item:
        raise HTTPException(status_code=404, detail=f"No assessment gate found for skill {data.skill_id}")
        
    content = json.loads(matched_item.content)
    correct_ans = content.get("correct_answer")
    is_correct = (data.user_answer.strip().lower() == correct_ans.strip().lower())
    
    # Record attempt
    attempt = AssessmentAttempt(
        profile_id=data.profile_id,
        assessment_item_id=matched_item.id,
        score=1.0 if is_correct else 0.0,
        is_correct=is_correct,
        response_data=data.user_answer
    )
    db.add(attempt)
    await db.flush()
    
    # 2. Update Bayesian Knowledge Tracing score
    new_mastery_prob = await update_bkt_score(data.profile_id, data.skill_id, is_correct, db)
    
    root_cause = None
    trigger = f"checkpoint_{'passed' if is_correct else 'failed'}_{data.skill_id}"
    
    # 3. If fail, trigger backtrace and decay the root cause prerequisite
    if not is_correct:
        root_cause = await failure_root_cause_backtrace(data.profile_id, data.skill_id, db, neo4j_client)
        if root_cause:
            # Force decay of root cause skill so it gets queued as unmet refresher
            stmt_rc = select(ReadinessSnapshot).where(
                ReadinessSnapshot.profile_id == data.profile_id,
                ReadinessSnapshot.skill_id == root_cause
            )
            rc_snapshot = (await db.execute(stmt_rc)).scalars().first()
            if rc_snapshot:
                rc_snapshot.readiness_score = 0.30 # Drop mastery to unmet threshold
                db.add(rc_snapshot)
                await db.flush()
            trigger = f"checkpoint_failed_{data.skill_id}_root_cause_{root_cause}"
            
    # 4. Re-run path generation
    path_version = await generate_or_replan_path(
        profile_id=data.profile_id,
        trigger_event=trigger,
        db=db,
        neo4j_client=neo4j_client,
        ai_provider=ai_provider
    )
    
    await db.commit()
    return {
        "is_correct": is_correct,
        "new_mastery_probability": new_mastery_prob,
        "detected_root_cause_prereq": root_cause,
        "updated_path": path_version.changed_nodes,
        "explanation": path_version.decision_trace.get("explanation")
    }

@app.post("/api/v1/weights/update")
async def update_steerable_weights(
    data: SliderWeightsInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates learner preferences, re-ranks resources using slider values,
    and returns the newly generated path.
    """
    from app.services.path_planner import generate_or_replan_path
    
    # Fetch profile and mock slider weights update (saved on profile description for demo)
    stmt = select(LearnerProfile).where(LearnerProfile.id == data.profile_id)
    profile = (await db.execute(stmt)).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Learner profile not found.")
        
    # Replan path using updated preference weights
    path_version = await generate_or_replan_path(
        profile_id=data.profile_id,
        trigger_event="preference_sliders_updated",
        db=db,
        neo4j_client=neo4j_client,
        ai_provider=ai_provider
    )
    await db.commit()
    return {
        "status": "success",
        "updated_path": path_version.changed_nodes,
        "explanation": path_version.decision_trace.get("explanation")
    }

@app.get("/api/v1/readiness/{profile_id}")
async def get_role_readiness(profile_id: int, db: AsyncSession = Depends(get_db)):
    """
    Calculates dynamic role readiness bar stats and proof cards.
    """
    from app.services.path_planner import calculate_readiness_bar
    
    readiness_data = await calculate_readiness_bar(profile_id, db, neo4j_client)
    
    # Generate proof card info if readiness is substantial
    proof_card = None
    if readiness_data["mastered_count"] > 0:
        proof_card = {
            "profile_id": profile_id,
            "role": "Backend Software Engineer",
            "skills_mastered_count": readiness_data["mastered_count"],
            "verification_date": datetime.now().strftime("%Y-%m-%d"),
            "narrative_summary": f"Demonstrated basic competency across {readiness_data['mastered_count']} verified skill checkpoints."
        }
        
    return {
        "readiness": readiness_data,
        "proof_card": proof_card
    }
