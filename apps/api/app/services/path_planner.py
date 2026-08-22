import logging
import math
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import (
    LearnerProfile, Goal, PathVersion, ReadinessSnapshot,
    Resource, AssessmentAttempt, AssessmentItem, User
)
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.ai.gateway import AIProvider
from app.services.graph_engine import build_skill_subgraph, get_topological_sort
from app.services.ranker import rank_resources_for_skill
from app.services.explainer import explain_recommendation

logger = logging.getLogger(__name__)

# BKT Constants
BKT_PRIOR = 0.15
BKT_TRANSITION = 0.20
BKT_SLIP = 0.10
BKT_GUESS = 0.20

# Forgetting Curve / Decay Constant (Stability in days)
DECAY_STABILITY_DAYS = 30.0

async def update_bkt_score(
    profile_id: int,
    skill_id: str,
    is_correct: bool,
    db: AsyncSession
) -> float:
    """
    Applies BKT probability formula to update a learner's skill mastery estimate.
    Saves the updated score in the ReadinessSnapshot table.
    """
    stmt = select(ReadinessSnapshot).where(
        ReadinessSnapshot.profile_id == profile_id,
        ReadinessSnapshot.skill_id == skill_id
    )
    result = await db.execute(stmt)
    snapshot = result.scalars().first()
    
    current_p = snapshot.readiness_score if snapshot else BKT_PRIOR
    
    # 1. Calculate posterior probability of mastery
    if is_correct:
        numerator = current_p * (1.0 - BKT_SLIP)
        denominator = numerator + (1.0 - current_p) * BKT_GUESS
    else:
        numerator = current_p * BKT_SLIP
        denominator = numerator + (1.0 - current_p) * (1.0 - BKT_GUESS)
        
    p_mastered_given_obs = numerator / (denominator + 1e-8)
    
    # 2. Account for learning transition
    new_p = p_mastered_given_obs + (1.0 - p_mastered_given_obs) * BKT_TRANSITION
    new_p = max(0.01, min(0.99, new_p))
    
    if snapshot:
        snapshot.readiness_score = new_p
        snapshot.last_updated = datetime.now(timezone.utc)
    else:
        snapshot = ReadinessSnapshot(
            profile_id=profile_id,
            skill_id=skill_id,
            readiness_score=new_p,
            last_updated=datetime.now(timezone.utc)
        )
        db.add(snapshot)
        
    await db.flush()
    return new_p

async def check_skill_decay(
    profile_id: int,
    db: AsyncSession
) -> Dict[str, float]:
    """
    Applies Ebbinghaus forgetting curve math to decay mastery levels over time.
    Formula: R = e^(-t / S) where t is time elapsed in days, S is stability strength.
    """
    stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == profile_id)
    result = await db.execute(stmt)
    snapshots = result.scalars().all()
    
    decayed_skills = {}
    now = datetime.now(timezone.utc)
    
    for s in snapshots:
        # Calculate days elapsed since last updated
        elapsed_days = (now - s.last_updated.replace(tzinfo=timezone.utc)).total_seconds() / 86400.0
        if elapsed_days <= 0:
            continue
            
        retention = math.exp(-elapsed_days / DECAY_STABILITY_DAYS)
        if retention < 0.98: # Apply decay if retention drops noticeability
            original_score = s.readiness_score
            s.readiness_score = max(0.01, s.readiness_score * retention)
            s.last_updated = now
            decayed_skills[s.skill_id] = s.readiness_score
            logger.info(f"Decayed skill '{s.skill_id}': {original_score:.3f} -> {s.readiness_score:.3f}")
            
    await db.flush()
    return decayed_skills

async def failure_root_cause_backtrace(
    profile_id: int,
    failed_skill_id: str,
    db: AsyncSession,
    neo4j_client: Neo4jClient
) -> Optional[str]:
    """
    Finds the likely root cause of a skill checkpoint failure by looking backward
    through Neo4j prerequisite edges and checking Postgres readiness scores.
    """
    # 1. Fetch prerequisites recursively using Neo4j path matching
    query = """
    MATCH path = (pre:Skill)-[:PREREQUISITE_OF*1..]->(s:Skill {id: $skill_id})
    RETURN pre.id AS id, pre.name AS name
    """
    try:
        with neo4j_client.driver.session() as session:
            result = session.run(query, {"skill_id": failed_skill_id})
            prereq_ids = [record["id"] for record in result]
    except Exception as e:
        logger.error(f"Neo4j path matching failed in root-cause backtrace: {e}")
        return None
        
    if not prereq_ids:
        return None
        
    # 2. Check Postgres readiness scores for these prerequisite skills
    stmt = select(ReadinessSnapshot).where(
        ReadinessSnapshot.profile_id == profile_id,
        ReadinessSnapshot.skill_id.in_(prereq_ids)
    )
    result = await db.execute(stmt)
    snapshots = {s.skill_id: s.readiness_score for s in result.scalars().all()}
    
    # Identify the weakest prerequisite
    weakest_skill = None
    lowest_score = 1.0
    
    for pid in prereq_ids:
        score = snapshots.get(pid, BKT_PRIOR)
        if score < 0.70 and score < lowest_score:
            lowest_score = score
            weakest_skill = pid
            
    return weakest_skill

async def generate_or_replan_path(
    profile_id: int,
    trigger_event: str,
    db: AsyncSession,
    neo4j_client: Neo4jClient,
    ai_provider: AIProvider,
    skip_skill_id: Optional[str] = None
) -> PathVersion:
    """
    Drives the Core Path Generation & Replanning Pipeline.
    Retrieves subgraphs, sorts topology, retrieves resources, structures decisions,
    and returns a new immutable PathVersion.
    """
    # 1. Fetch learner context & goal
    profile_stmt = select(LearnerProfile).where(LearnerProfile.id == profile_id)
    profile = (await db.execute(profile_stmt)).scalars().first()
    if not profile:
        raise ValueError(f"Learner profile {profile_id} not found.")
        
    goal_stmt = select(Goal).where(Goal.profile_id == profile_id).order_by(Goal.created_at.desc())
    goal = (await db.execute(goal_stmt)).scalars().first()
    target_goal = goal.title if goal else "Backend Software Engineer"
    
    # Define target skills (either matched or seeded defaults)
    target_skills = [{"name": "System Design & Scale"}] # Default target for backend SWE
    
    # 2. Check skill decay first before sorting topology
    await check_skill_decay(profile_id, db)
    
    # 3. Retrieve readiness snapshots (mastered skills are those with score >= 0.7)
    readiness_stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == profile_id)
    snapshots = {s.skill_id: s.readiness_score for s in (await db.execute(readiness_stmt)).scalars().all()}
    
    # 4. Build subgraph from Neo4j using target skills
    G = build_skill_subgraph(target_skills, ai_provider, neo4j_client)
    
    # 5. Extract topological sort order
    all_ordered_skills = get_topological_sort(G)
    
    # If skipping a skill, remove it and its descendants
    if skip_skill_id and skip_skill_id in G:
        # Find all nodes that depend on skip_skill_id
        import networkx as nx
        descendants = nx.descendants(G, skip_skill_id)
        to_remove = descendants | {skip_skill_id}
        all_ordered_skills = [s for s in all_ordered_skills if s not in to_remove]
        
    # Filter out skills already mastered (mastered score >= 0.70)
    unmet_skills = [s for s in all_ordered_skills if snapshots.get(s, BKT_PRIOR) < 0.70]
    
    if not unmet_skills:
        # All skills are completed
        active_skill = None
        remaining_path = []
    else:
        active_skill = unmet_skills[0]
        remaining_path = unmet_skills
        
    # 6. Retrieve and rank resources for the active skill (if any)
    active_resource = None
    explanation = ""
    decision_trace = {}
    
    if active_skill:
        # Build user profile context dict
        user_context = {
            "preferred_modality": "video", # Default preference
            "weights": {"speed": 0.5, "depth": 0.5, "cost": 0.5} # Default weights
        }
        
        # Pull slider preferences from goals or metadata
        if goal and goal.description:
            try:
                user_context["preferred_modality"] = goal.description
            except Exception:
                pass
                
        ranked_resources = await rank_resources_for_skill(
            active_skill, user_context, ai_provider, neo4j_client, db_session=db
        )
        if ranked_resources:
            active_resource = ranked_resources[0]
            
            # Setup decision trace for explanation grounding
            decision_trace = {
                "target_goal": target_goal,
                "active_skill": active_skill,
                "preferred_modality": user_context["preferred_modality"],
                "weights": user_context["weights"],
                "resource_title": active_resource.title,
                "resource_url": active_resource.url
            }
            explanation = await explain_recommendation(
                active_skill, active_resource.title, ai_provider, neo4j_client, decision_trace
            )
            
    # Calculate time reality check (Feature 4)
    estimated_hours = len(remaining_path) * 2.5 # Assume 2.5 hours per skill node
    time_limit_months = 4 # Default 4 months
    estimated_months = estimated_hours / 40.0 # Assume 40 hours of learning per month
    time_budget_warning = estimated_months > time_limit_months
    
    # 7. Save and return new immutable PathVersion
    # Find parent version
    parent_stmt = select(PathVersion).where(PathVersion.profile_id == profile_id).order_by(PathVersion.created_at.desc())
    parent = (await db.execute(parent_stmt)).scalars().first()
    parent_id = parent.id if parent else None
    
    changed_nodes_data = {
        "active_skill": active_skill,
        "active_resource_id": active_resource.id if active_resource else None,
        "active_resource_title": active_resource.title if active_resource else None,
        "active_resource_url": active_resource.url if active_resource else None,
        "remaining_path": remaining_path,
        "all_ordered_skills": all_ordered_skills,
    }
    
    trace_data = {
        "decision_trace": decision_trace,
        "explanation": explanation,
        "estimated_hours": estimated_hours,
        "time_budget_warning": time_budget_warning
    }
    
    path_version = PathVersion(
        profile_id=profile_id,
        parent_version_id=parent_id,
        trigger_event=trigger_event,
        changed_nodes=changed_nodes_data,
        decision_trace=trace_data,
        created_at=datetime.now(timezone.utc)
    )
    
    db.add(path_version)
    await db.flush()
    return path_version

async def calculate_readiness_bar(
    profile_id: int,
    db: AsyncSession,
    neo4j_client: Neo4jClient
) -> Dict[str, Any]:
    """
    Computes Role Readiness using:
    readiness = weighted_skill_coverage * evidence_quality_factor * recency_factor * assessment_confidence
    """
    # 1. Fetch total skill count in the role graph
    try:
        with neo4j_client.driver.session() as session:
            count_result = session.run("MATCH (s:Skill) RETURN count(s) AS cnt").single()
            total_skills = count_result["cnt"] if count_result else 15
    except Exception:
        total_skills = 15

    # 2. Fetch readiness snapshots
    stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == profile_id)
    snapshots = (await db.execute(stmt)).scalars().all()
    
    mastered_skills = [s for s in snapshots if s.readiness_score >= 0.70]
    
    # 3. Calculate weighted skill coverage
    skill_coverage = len(mastered_skills) / max(1, total_skills)
    
    # 4. Calculate evidence quality factor (based on number of Prove-It gates passed vs clicked)
    # Since we strictly require Prove-It gating, evidence is high for all attempts
    attempt_stmt = select(AssessmentAttempt).where(AssessmentAttempt.profile_id == profile_id)
    attempts = (await db.execute(attempt_stmt)).scalars().all()
    passed_attempts = [a for a in attempts if a.is_correct]
    
    evidence_factor = 0.5 + (min(len(passed_attempts), 10) / 20.0) # Scales between 0.5 and 1.0
    
    # 5. Calculate recency factor (decreases if last activity was long ago)
    if snapshots:
        latest_update = max(s.last_updated for s in snapshots).replace(tzinfo=timezone.utc)
        elapsed_days = (datetime.now(timezone.utc) - latest_update).total_seconds() / 86400.0
        recency_factor = max(0.5, math.exp(-elapsed_days / 60.0)) # 60-day half-life decay
    else:
        recency_factor = 1.0
        
    # 6. Calculate average assessment confidence score
    if mastered_skills:
        avg_confidence = sum(s.readiness_score for s in mastered_skills) / len(mastered_skills)
    else:
        avg_confidence = BKT_PRIOR
        
    # Final Formula
    readiness_percentage = skill_coverage * evidence_factor * recency_factor * avg_confidence
    
    return {
        "readiness_score": min(1.0, max(0.0, readiness_percentage)),
        "skill_coverage": skill_coverage,
        "evidence_factor": evidence_factor,
        "recency_factor": recency_factor,
        "avg_confidence": avg_confidence,
        "mastered_count": len(mastered_skills),
        "total_skills": total_skills
    }
