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

from contextlib import asynccontextmanager

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Auto-initialize database tables and seed demo profile if not present on startup.
    """
    try:
        from app.core.db import engine, async_session
        from app.models.base import Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        async with async_session() as session:
            stmt = select(User).where(User.email == "demo@pathfinder.dev")
            user = (await session.execute(stmt)).scalars().first()
            if not user:
                user = User(clerk_id="clerk_demo_user", email="demo@pathfinder.dev")
                session.add(user)
                await session.flush()
                profile = LearnerProfile(user_id=user.id, current_context="Backend Software Engineer")
                session.add(profile)
                await session.flush()
                
                # Seed initial baseline readiness snapshots for demo
                for skill in ["python_basics", "sql_basics", "git_foundations", "http_methods"]:
                    session.add(ReadinessSnapshot(profile_id=profile.id, skill_id=skill, readiness_score=0.85))
                await session.commit()
                logger.info("[Startup] Successfully initialized database tables and demo profile #1.")
    except Exception as e:
        logger.warning(f"[Startup] Database table initialization warning: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)


# Enable CORS for frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
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

class CoachChatInput(BaseModel):
    skill_id: str
    message: str

class SliderWeightsInput(BaseModel):
    profile_id: int
    speed: float = Field(default=0.5, ge=0.0, le=1.0)
    depth: float = Field(default=0.5, ge=0.0, le=1.0)
    cost: float = Field(default=0.5, ge=0.0, le=1.0)

class ScrapeJobsInput(BaseModel):
    source: str = Field(default="greenhouse", description="Source adapter name (e.g. 'greenhouse')")
    board_token: str = Field(..., description="Job board identifier token (e.g. 'canonical', 'stripe')")
    company_name: Optional[str] = Field(default=None, description="Optional company display name")
    limit: Optional[int] = Field(default=None, ge=1, description="Max jobs to return")

# --- Innovation Endpoint Schemas (imported from service modules) ---
# These are re-exported here so they appear in the OpenAPI schema.
from app.services.process_diagnostics import DebuggingTelemetryInput, DebuggingDiagnosticReport
from app.services.skip_delta import SkipDeltaInput, SkipDeltaReport
from app.services.calibration import CalibrationInput, CalibrationReport
from app.services.career_engine import CareerAlternativesReport
from app.services.placement_engine import (
    PlacementDriveInput, PlacementPlanReport,
    MentorTriageInput, MentorTriageReport,
)
from app.services.noise_filter import RoadmapAnalysisInput, RoadmapAnalysisReport


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
        
        # Format the path for the frontend
        ordered_skills = path_version.changed_nodes.get("all_ordered_skills", [])
        formatted_path = [{"id": s, "name": s.replace('_', ' ').title()} for s in ordered_skills]
        
        return {
            "status": "completed",
            "message": "Diagnostic complete! Learning path generated.",
            "path": formatted_path
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

@app.get("/api/v1/checkpoint/{skill_id}")
async def get_checkpoint(
    skill_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches the assessment question and options for a given skill.
    Strips out the correct_answer to prevent cheating.
    """
    stmt = select(AssessmentItem)
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    for item in items:
        content = json.loads(item.content)
        if content.get("target_skill") == skill_id:
            return {
                "question": content.get("question", ""),
                "options": content.get("options", [])
            }
            
    raise HTTPException(status_code=404, detail=f"No assessment found for skill {skill_id}")

@app.post("/api/v1/coach/chat")
async def chat_with_coach(
    data: CoachChatInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Chats with the AI coach about a specific skill.
    """
    # For now, just generate a dynamic message instead of passing through full LLM stream
    # to keep it fast and simple for the demo.
    from app.infrastructure.ai.gateway import ai_provider
    prompt = f"The user is asking a question about the skill '{data.skill_id}': '{data.message}'. Give a brief, encouraging, 1-2 sentence response explaining a concept."
    try:
        response = await ai_provider.client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=300,
            system="You are an expert, encouraging technical AI coach. Be concise.",
            messages=[{"role": "user", "content": prompt}]
        )
        reply = response.content[0].text.strip()
    except Exception as e:
        reply = f"That's a great question about {data.skill_id}! I'd love to explain {data.message} in more detail when I have full connectivity."
        
    return {"reply": reply}

@app.post("/api/v1/checkpoint/submit")
async def submit_checkpoint_answer(
    data: CheckpointSubmitInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a Prove-It quiz check with flexible grading (regex, case/whitespace normalization,
    option indexing). If fails, runs root-cause backtrace with parent fallback, decays weak
    prerequisites, replans, and returns results.
    """
    from app.services.path_planner import update_bkt_score, failure_root_cause_backtrace, generate_or_replan_path
    from app.services.grader import evaluate_answer
    
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
    options = content.get("options", [])
    
    # Flexible Grading (Feature 4)
    is_correct = await evaluate_answer(
        user_answer=data.user_answer,
        correct_answer=correct_ans,
        options=options,
        ai_provider=ai_provider
    )
    
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
    
    # 2. Update Bayesian Knowledge Tracing score using custom dynamic node parameters (Feature 1)
    new_mastery_prob = await update_bkt_score(
        profile_id=data.profile_id,
        skill_id=data.skill_id,
        is_correct=is_correct,
        db=db,
        neo4j_client=neo4j_client
    )
    
    root_cause = None
    trigger = f"checkpoint_{'passed' if is_correct else 'failed'}_{data.skill_id}"
    
    # 3. If fail, trigger backtrace with immediate parent fallback (Feature 2)
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
        "explanation": path_version.decision_trace.get("explanation"),
        "estimated_hours": path_version.decision_trace.get("estimated_hours")
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
    
    # Fetch profile
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
        "explanation": path_version.decision_trace.get("explanation"),
        "estimated_hours": path_version.decision_trace.get("estimated_hours")
    }

@app.get("/api/v1/readiness/{profile_id}")
async def get_role_readiness(profile_id: int, db: AsyncSession = Depends(get_db)):
    """
    Calculates dynamic role readiness bar stats and cryptographically signed proof cards.
    """
    from app.services.path_planner import calculate_readiness_bar
    from app.services.proof_card import generate_signed_proof_card
    
    readiness_data = await calculate_readiness_bar(profile_id, db, neo4j_client)
    
    # Fetch mastered skills
    stmt = select(ReadinessSnapshot).where(
        ReadinessSnapshot.profile_id == profile_id,
        ReadinessSnapshot.readiness_score >= 0.70
    )
    mastered_snapshots = (await db.execute(stmt)).scalars().all()
    mastered_skill_ids = [s.skill_id for s in mastered_snapshots]
    
    # Generate cryptographically signed Proof Card
    proof_card = None
    if len(mastered_skill_ids) > 0:
        proof_card = generate_signed_proof_card(
            profile_id=profile_id,
            role="Backend Software Engineer",
            mastered_skills=mastered_skill_ids,
            readiness_score=readiness_data["readiness_score"]
        )
        
    return {
        "readiness": readiness_data,
        "proof_card": proof_card
    }

@app.post("/api/v1/readiness/decay")
async def trigger_active_decay(db: AsyncSession = Depends(get_db)):
    """
    Actively triggers Ebbinghaus forgetting curve decay on all learner profiles (Feature 5).
    """
    from app.workers.decay_worker import run_active_decay_for_all
    report = await run_active_decay_for_all(db)
    return report

@app.get("/api/v1/proof-card/{profile_id}")
async def get_proof_card(profile_id: int, db: AsyncSession = Depends(get_db)):
    """
    Generates and returns a cryptographically signed Proof Card credential (Feature 6).
    """
    from app.services.path_planner import calculate_readiness_bar
    from app.services.proof_card import generate_signed_proof_card
    
    readiness_data = await calculate_readiness_bar(profile_id, db, neo4j_client)
    
    stmt = select(ReadinessSnapshot).where(
        ReadinessSnapshot.profile_id == profile_id,
        ReadinessSnapshot.readiness_score >= 0.70
    )
    mastered_snapshots = (await db.execute(stmt)).scalars().all()
    mastered_skill_ids = [s.skill_id for s in mastered_snapshots]
    
    card = generate_signed_proof_card(
        profile_id=profile_id,
        role="Backend Software Engineer",
        mastered_skills=mastered_skill_ids,
        readiness_score=readiness_data["readiness_score"]
    )
    return card

@app.get("/api/v1/proof-card/{profile_id}/svg")
async def get_proof_card_svg_endpoint(profile_id: int, db: AsyncSession = Depends(get_db)):
    """
    Exports a rendered high-fidelity SVG badge certificate for the Proof Card (Feature 6).
    """
    from fastapi.responses import Response
    from app.services.path_planner import calculate_readiness_bar
    from app.services.proof_card import generate_signed_proof_card, generate_proof_card_svg
    
    readiness_data = await calculate_readiness_bar(profile_id, db, neo4j_client)
    
    stmt = select(ReadinessSnapshot).where(
        ReadinessSnapshot.profile_id == profile_id,
        ReadinessSnapshot.readiness_score >= 0.70
    )
    mastered_snapshots = (await db.execute(stmt)).scalars().all()
    mastered_skill_ids = [s.skill_id for s in mastered_snapshots]
    
    card = generate_signed_proof_card(
        profile_id=profile_id,
        role="Backend Software Engineer",
        mastered_skills=mastered_skill_ids,
        readiness_score=readiness_data["readiness_score"]
    )
    
    svg_content = generate_proof_card_svg(card)
    return Response(content=svg_content, media_type="image/svg+xml")

@app.post("/api/v1/proof-card/verify")
async def verify_proof_card_endpoint(card_data: Dict[str, Any] = Body(...)):
    """
    Cryptographically verifies the authenticity of a submitted Proof Card credential (Feature 6).
    """
    from app.services.proof_card import verify_proof_card_signature
    is_valid = verify_proof_card_signature(card_data)
    return {
        "is_valid": is_valid,
        "credential_id": card_data.get("credential_id"),
        "status": "AUTHENTIC" if is_valid else "INVALID_OR_TAMPERED"
    }

@app.get("/api/v1/scraper/sources")
async def get_scraper_sources():
    """
    Returns available job board source adapters for data collection.
    """
    return {
        "sources": [
            {
                "id": "greenhouse",
                "name": "Greenhouse ATS",
                "description": "Scrapes public Greenhouse job boards via REST API",
                "requires_token": True,
                "example_tokens": ["canonical", "stripe", "github"]
            }
        ]
    }

@app.post("/api/v1/scraper/scrape")
async def scrape_jobs_endpoint(data: ScrapeJobsInput):
    """
    Executes the job scraping pipeline to fetch, clean, normalize, validate,
    and deduplicate job postings from an external applicant tracking system.
    """
    from app.scraper.pipeline import JobScrapingPipeline
    from app.scraper.sources import (
        GreenhouseSource,
        LeverSource,
        AshbySource,
        AmazonJobsSource,
        GoogleCareersSource,
    )
    
    pipeline = JobScrapingPipeline()
    src_lower = data.source.lower()
    if src_lower == "greenhouse":
        source = GreenhouseSource()
    elif src_lower == "lever":
        source = LeverSource()
    elif src_lower == "ashby":
        source = AshbySource()
    elif src_lower in ("amazon", "amazon_jobs"):
        source = AmazonJobsSource()
    elif src_lower in ("google", "google_careers"):
        source = GoogleCareersSource()
    else:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported source '{data.source}'. Supported sources: 'greenhouse', 'lever', 'ashby', 'amazon', 'google'"
        )
        
    result = await pipeline.run_pipeline(
        source=source,
        board_identifier=data.board_token,
        company_name=data.company_name
    )
    
    if data.limit and data.limit > 0:
        result.jobs = result.jobs[:data.limit]
        result.total_deduplicated = len(result.jobs)
        
    return result



# =============================================================================
# INNOVATION ENDPOINTS
# =============================================================================

@app.post("/api/v1/diagnostics/debug-telemetry", response_model=DebuggingDiagnosticReport)
async def submit_debug_telemetry(data: DebuggingTelemetryInput):
    """
    [Innovation 1] SDT Evidence-Based Process-Praise — Keystroke & Diff Debugging Diagnostic.

    Accepts a sequence of IDE snapshots (diffs, test results, timestamps) from the
    embedded coding sandbox and returns a structured DebuggingDiagnosticReport with:
    - Thrash Index (T_i) quantifying the efficiency of the debugging strategy.
    - Strategy classification: BINARY_SEARCH_ISOLATION | HYPOTHESIS_DRIVEN | EXPLORATORY | RANDOM_THRASHING.
    - Evidence-based process-praise text grounded in real session metrics.
    - Competency deltas for Systematic Debugging, TDD, and Code Precision.
    """
    from app.services.process_diagnostics import analyze_debug_session
    try:
        report = await analyze_debug_session(data, ai_provider)
        return report
    except Exception as e:
        logger.exception("Debug telemetry analysis failed")
        raise HTTPException(status_code=500, detail=f"Process diagnostics failed: {e}")


@app.post("/api/v1/simulate-skip-delta", response_model=SkipDeltaReport)
async def simulate_skip_with_date_delta(
    data: SkipDeltaInput,
    db: AsyncSession = Depends(get_db),
):
    """
    [Innovation 2] Live What-If-Skip Graph Simulation with Target Date-Delta.

    Computes the full downstream impact of skipping skill S:
    - All blocked descendants in the DAG (Neo4j → NetworkX traversal).
    - Friction hours penalty per blocked node.
    - Exact calendar date shift projected against the learner's weekly study budget.
    - Human-readable verdict and skip recommendation.

    Frontend should use blocked_nodes list to pulse amber borders on the React Flow graph
    and update the target date display live as the user adjusts their weekly_study_hours slider.
    """
    from app.services.skip_delta import compute_skip_delta
    try:
        report = await compute_skip_delta(data, db, neo4j_client)
        return report
    except Exception as e:
        logger.exception("Skip delta simulation failed")
        raise HTTPException(status_code=500, detail=f"Skip simulation failed: {e}")


@app.post("/api/v1/calibration/evaluate", response_model=CalibrationReport)
async def evaluate_calibration_check(data: CalibrationInput):
    """
    [Innovation 3] Confidence–Competence 2x2 Calibration Matrix Evaluator.

    Accepts the learner's pre-quiz self-rated confidence and post-quiz actual score
    and classifies them into one of four calibration quadrants:
    - CALIBRATED_MASTERY: Self-model is accurate. Proof Card unlock if score ≥ 0.80.
    - BLINDSPOT: Dunning-Kruger detected. Counterexample injection triggered.
    - IMPOSTER_ZONE: Imposter Syndrome detected. Proof Card forced-unlocked.
    - CALIBRATED_NOVICE: Accurate awareness of beginner status. Encouragement mode.
    """
    from app.services.calibration import evaluate_calibration
    try:
        report = evaluate_calibration(data)
        return report
    except Exception as e:
        logger.exception("Calibration evaluation failed")
        raise HTTPException(status_code=500, detail=f"Calibration check failed: {e}")


@app.get("/api/v1/career/alternatives/{profile_id}", response_model=CareerAlternativesReport)
async def get_career_alternatives(
    profile_id: int,
    current_role_id: str = "backend_swe",
    weekly_study_hours: float = 10.0,
    db: AsyncSession = Depends(get_db),
):
    """
    [Innovation 5] Dynamic Career Alternatives & Pivot Panel.

    Computes the learner's weighted readiness score across 5 adjacent role clusters
    (Backend SWE, Data Engineer, DevOps/Platform, MLOps, Full-Stack) by comparing
    their BKT ReadinessSnapshot vector against each role's required skill list.

    Returns roles sorted by:
    1. Fast-Track first (reachable sooner than current target role).
    2. Readiness descending.
    3. Market demand score.
    """
    from app.services.career_engine import get_career_alternatives
    try:
        report = await get_career_alternatives(
            profile_id=profile_id,
            db=db,
            neo4j_client=neo4j_client,
            current_role_id=current_role_id,
            weekly_study_hours=weekly_study_hours,
        )
        return report
    except Exception as e:
        logger.exception("Career alternatives computation failed")
        raise HTTPException(status_code=500, detail=f"Career alternatives failed: {e}")


@app.post("/api/v1/placement/plan", response_model=PlacementPlanReport)
async def generate_placement_sprint_plan(
    data: PlacementDriveInput,
    db: AsyncSession = Depends(get_db),
):
    """
    [Innovation 6a] Placement Season War Room — Sprint Planner.

    Given a company target and interview date, generates a week-by-week sprint plan
    tailored to the company's known skill priorities (Microsoft, Amazon, Google, Stripe, etc.).

    Includes:
    - Gap skill identification (company priority skills not yet mastered).
    - Weekly task allocations with focus areas.
    - Final crunch-review week with mock interview tasks.
    - Feasibility check: flags if study budget is insufficient.
    """
    from app.services.placement_engine import generate_placement_plan
    try:
        report = await generate_placement_plan(data, db, neo4j_client)
        return report
    except Exception as e:
        logger.exception("Placement plan generation failed")
        raise HTTPException(status_code=500, detail=f"Placement plan failed: {e}")


@app.post("/api/v1/placement/triage", response_model=MentorTriageReport)
async def generate_mentor_triage(
    data: MentorTriageInput,
    db: AsyncSession = Depends(get_db),
):
    """
    [Innovation 6b] Mentor Load Balancer — Triage Queue Generator.

    Computes a triage-sorted queue of learners for mentor office hours.
    Priority formula: readiness * (1 + urgency_factor) * proximity_bonus
    where proximity_bonus = 1.5 for learners in the 80-95% readiness breakthrough zone.

    Mentors should focus on breakthrough-zone learners first — they need only one
    targeted session to clear a hiring-readiness threshold.
    """
    from app.services.placement_engine import generate_mentor_triage_queue
    try:
        report = await generate_mentor_triage_queue(data, db, neo4j_client)
        return report
    except Exception as e:
        logger.exception("Mentor triage generation failed")
        raise HTTPException(status_code=500, detail=f"Mentor triage failed: {e}")


@app.post("/api/v1/roadmap/sanity-check", response_model=RoadmapAnalysisReport)
async def roadmap_sanity_check(data: RoadmapAnalysisInput):
    """
    [Innovation 7] Tutor Noise & Roadmap Sanity Filter.

    Accepts any pasted external roadmap advice (YouTube titles, Reddit post, blog text)
    and classifies each extracted skill mention against:
    1. The canonical PathFinder Neo4j skill graph.
    2. Live market demand data from the Greenhouse job scraping pipeline.

    Output labels per skill:
    🟢 ALIGNED          — In graph, high market demand. This advice is solid.
    🟡 HARMLESS_EXTRA   — Valid but not on the critical hiring path. Low opportunity cost.
    🔴 MISLEADING       — Outside graph, outdated, or low market demand. Can delay readiness.
    ⚪ UNKNOWN          — Could not be matched to any graph node.
    """
    from app.services.noise_filter import analyze_roadmap_noise
    try:
        report = await analyze_roadmap_noise(data, neo4j_client, ai_provider)
        return report
    except Exception as e:
        logger.exception("Roadmap sanity check failed")
        raise HTTPException(status_code=500, detail=f"Roadmap analysis failed: {e}")


# =============================================================================
# DAY-ONE SIMULATOR ENDPOINTS
# =============================================================================

from app.models.simulator import (
    TicketSchema,
    SimulatorChatInput,
    SimulatorChatResponse,
    PRReviewResult,
    SimulatorPRInput
)

@app.get("/api/v1/simulator/tickets/{profile_id}", response_model=List[TicketSchema])
async def get_tickets(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    [Day-One Simulator] Fetches all Kanban board tickets derived from the user's latest path.
    """
    from app.services.simulator import get_simulator_board
    try:
        tickets = await get_simulator_board(profile_id, db)
        return tickets
    except Exception as e:
        logger.exception("Failed to fetch simulator tickets")
        raise HTTPException(status_code=500, detail=f"Failed to fetch tickets: {e}")

@app.post("/api/v1/simulator/ticket/{ticket_id}/chat", response_model=SimulatorChatResponse)
async def chat_with_stakeholder_endpoint(
    ticket_id: str,
    data: SimulatorChatInput
):
    """
    [Day-One Simulator] Sends a message to the AI PM or AI Client persona for ticket requirements.
    """
    from app.services.simulator import chat_with_stakeholder
    try:
        response = await chat_with_stakeholder(ticket_id, data, ai_provider)
        return response
    except Exception as e:
        logger.exception("Failed to chat with stakeholder")
        raise HTTPException(status_code=500, detail=f"Stakeholder chat failed: {e}")

@app.post("/api/v1/simulator/ticket/{ticket_id}/submit-pr", response_model=PRReviewResult)
async def submit_pr_endpoint(
    ticket_id: str,
    data: SimulatorPRInput
):
    """
    [Day-One Simulator] Submits code for code review by AI Senior Developer.
    """
    from app.services.simulator import review_pull_request
    try:
        result = await review_pull_request(ticket_id, data, ai_provider)
        return result
    except Exception as e:
        logger.exception("PR submission failed")
        raise HTTPException(status_code=500, detail=f"PR review failed: {e}")

