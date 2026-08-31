import logging
import math
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import networkx as nx
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import (
    LearnerProfile, Goal, PathVersion, ReadinessSnapshot,
    Resource, ResourceMetadata, AssessmentAttempt, AssessmentItem, User, SkillRecord
)
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.ai.gateway import AIProvider
from app.services.graph_engine import build_skill_subgraph, get_topological_sort
from app.services.ranker import rank_resources_for_skill
from app.services.explainer import explain_recommendation
from app.services.bkt_engine import get_skill_bkt_params, update_bkt_score, check_skill_decay, DEFAULT_BKT_PRIOR
from app.db.repositories.skill_repo import SkillRepository
from app.infrastructure.neo4j.repositories import Neo4jSkillRepository

logger = logging.getLogger(__name__)

async def failure_root_cause_backtrace(
    profile_id: int,
    failed_skill_id: str,
    db: AsyncSession,
    neo4j_client: Neo4jClient
) -> Optional[str]:
    """
    Finds the likely root cause of a skill checkpoint failure by looking backward
    through Neo4j prerequisite edges and checking Postgres readiness scores.
    
    Fallback Strategy:
    If all ancestors are technically above the 0.70 threshold, it falls back to decay
    the immediate parent prerequisite node (with lowest score) so the learner receives
    a focused refresher.
    """
    # 1. Fetch all ancestors recursively from Neo4j
    neo4j_repo = Neo4jSkillRepository(neo4j_client)
    pg_repo = SkillRepository(db)

    ancestor_ids = neo4j_repo.get_all_ancestors(failed_skill_id)
        
    if not ancestor_ids:
        return None
        
    # 2. Check Postgres readiness scores for all ancestors
    snapshots = await pg_repo.get_ancestor_readiness(profile_id, ancestor_ids)
    
    # 3. Identify the weakest prerequisite among sub-0.70 nodes
    weakest_skill = None
    lowest_score = 1.0
    
    for pid in ancestor_ids:
        score = snapshots.get(pid, DEFAULT_BKT_PRIOR)
        if score < 0.70 and score < lowest_score:
            lowest_score = score
            weakest_skill = pid
            
    if weakest_skill:
        return weakest_skill

    # 4. FALLBACK: All ancestors are >= 0.70.
    # Query direct (immediate) prerequisite parents and select the one with the lowest score.
    direct_parents = neo4j_repo.get_direct_parents(failed_skill_id)

    if direct_parents:
        # Fallback to the lowest-scoring direct parent
        fallback_parent = min(direct_parents, key=lambda pid: snapshots.get(pid, 1.0))
        logger.info(f"Root-cause fallback triggered: selected direct parent '{fallback_parent}'")
        return fallback_parent

    return None

async def generate_or_replan_path(
    profile_id: int,
    trigger_event: str,
    db: AsyncSession,
    neo4j_client: Neo4jClient,
    ai_provider: AIProvider,
    skip_skill_id: Optional[str] = None,
    weights: Optional[Dict[str, float]] = None
) -> PathVersion:
    """
    Drives the Core Path Generation & Replanning Pipeline.
    Retrieves subgraphs, sorts topology, retrieves resources, calculates realistic durations,
    and returns a new immutable PathVersion.
    """
    # 1. Fetch learner context & goal
    profile_stmt = select(LearnerProfile).where(LearnerProfile.id == profile_id)
    profile = (await db.execute(profile_stmt)).scalars().first()
    if not profile:
        raise ValueError(f"Learner profile {profile_id} not found.")
        
    goal_stmt = select(Goal).where(Goal.profile_id == profile_id).order_by(Goal.created_at.desc())
    goal = (await db.execute(goal_stmt)).scalars().first()
    target_goal = goal.title if goal else (profile.current_context or "Backend Software Engineer")
    
    # 2. Check skill decay first before sorting topology
    await check_skill_decay(profile_id, db)
    
    # Map all skill IDs to their display names and vice-versa
    skill_records = (await db.execute(select(SkillRecord))).scalars().all()
    id_to_name = {s.id: s.name for s in skill_records}
    name_to_id = {s.name: s.id for s in skill_records}
    
    # Resolve target skills dynamically based on target role/goal cluster
    from app.services.career_engine import ROLE_CLUSTERS
    target_skills = []
    matched_cluster = None
    for r_id, cluster in ROLE_CLUSTERS.items():
        if (
            target_goal.lower() == r_id.lower() 
            or target_goal.lower() == cluster["title"].lower()
            or (profile.current_context and profile.current_context.lower() == cluster["title"].lower())
            or (profile.current_context and profile.current_context.lower() == r_id.lower())
        ):
            matched_cluster = cluster
            break

    if matched_cluster:
        for sid in matched_cluster["required_skills"]:
            sname = id_to_name.get(sid, sid.replace("_", " ").title())
            target_skills.append({"name": sname})
    else:
        logger.info(f"Target role '{target_goal}' not found in clusters. Using AI to extract fallback core skills.")
        try:
            # Dynamically extract core skills from the target goal via the AI Gateway
            parsed_intent = await ai_provider.parse_goal(target_goal)
            if "current_skills" in parsed_intent and parsed_intent["current_skills"]:
                for s in parsed_intent["current_skills"][:5]: # Take top 5 inferred foundational skills
                    target_skills.append({"name": s.title()})
            
            if not target_skills:
                target_skills = [{"name": "System Design & Scale"}, {"name": "Algorithms"}]
        except Exception as fallback_e:
            logger.error(f"AI Fallback for target_skills failed: {fallback_e}")
            target_skills = [{"name": "System Design & Scale"}, {"name": "Algorithms"}]
    
    # 3. Retrieve readiness snapshots (mastered skills are those with score >= 0.70)
    readiness_stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == profile_id)
    snapshot_records = (await db.execute(readiness_stmt)).scalars().all()
    snapshots: Dict[str, float] = {}
    for s in snapshot_records:
        score = s.readiness_score
        sid = s.skill_id
        sname = id_to_name.get(sid, sid)
        
        for k in [sid, sname, sid.lower(), sname.lower(),
                  sid.replace("_", " "), sname.replace("_", " "),
                  sid.replace(" ", "_"), sname.replace(" ", "_")]:
            snapshots[k.lower()] = max(snapshots.get(k.lower(), 0.0), score)
    
    # 4. Build subgraph from Neo4j using target skills
    G = await build_skill_subgraph(target_skills, ai_provider, neo4j_client)
    
    # 5. Extract topological sort order
    all_ordered_skills = get_topological_sort(G)
    
    # If skipping a skill, remove it and its descendants
    if skip_skill_id and skip_skill_id in G:
        descendants = nx.descendants(G, skip_skill_id)
        to_remove = descendants | {skip_skill_id}
        all_ordered_skills = [s for s in all_ordered_skills if s not in to_remove]
        
    def get_skill_score(skill_name: str) -> float:
        norm = skill_name.strip().lower()
        mapped_id = name_to_id.get(skill_name, "").lower()
        return max(
            snapshots.get(norm, 0.0),
            snapshots.get(norm.replace("_", " "), 0.0),
            snapshots.get(norm.replace(" ", "_"), 0.0),
            snapshots.get(mapped_id, 0.0),
            snapshots.get(mapped_id.replace("_", " "), 0.0),
            snapshots.get(mapped_id.replace(" ", "_"), 0.0)
        )

    # Filter out skills already mastered (mastered score >= 0.70)
    unmet_skills = [s for s in all_ordered_skills if get_skill_score(s) < 0.70]
    completed_skills = [s for s in all_ordered_skills if get_skill_score(s) >= 0.70]
    
    if not unmet_skills:
        active_skill = None
        remaining_path = []
    else:
        active_skill = unmet_skills[0]
        remaining_path = unmet_skills
        
    # 6. Retrieve and rank resources for the active skill (if any)
    active_resource = None
    explanation = ""
    decision_trace = {}
    
    if not active_skill:
        explanation = "Outstanding achievement! You have mastered all prerequisite milestones for this path."
        decision_trace = {
            "target_goal": target_goal,
            "status": "ALL_MILESTONES_MASTERED",
            "completed_count": len(completed_skills)
        }
    
    # Build user profile context dict
    user_context = {
        "preferred_modality": "video",
        "weights": weights or {"speed": 0.5, "depth": 0.5, "cost": 0.5}
    }
    if goal and goal.description:
        user_context["preferred_modality"] = goal.description

    if active_skill:
        ranked_resources = await rank_resources_for_skill(
            active_skill, user_context, ai_provider, neo4j_client, db_session=db
        )
        if ranked_resources:
            active_resource = ranked_resources[0]
            
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
            
    # 7. Time-Budget Reality Check using ACTUAL Resource Durations (Feature 8)
    total_duration_minutes = 0.0
    for skill_name in remaining_path:
        # Fetch best matching resource duration for each skill in path
        stmt_meta = (
            select(ResourceMetadata.value)
            .join(Resource, Resource.id == ResourceMetadata.resource_id)
            .join(ResourceMetadata, ResourceMetadata.resource_id == Resource.id)
            .where(ResourceMetadata.key == "skill_id", ResourceMetadata.value == skill_name)
        )
        # Query duration_minutes for this skill's tagged resources
        stmt_res = (
            select(Resource)
            .join(ResourceMetadata)
            .where(ResourceMetadata.key == "skill_id", ResourceMetadata.value == skill_name)
            .options(selectinload(Resource.metadata_relations))
        )
        res_list = (await db.execute(stmt_res)).scalars().all()
        if res_list:
            meta_dict = {m.key: m.value for m in res_list[0].metadata_relations}
            try:
                dur = float(meta_dict.get("duration_minutes", 60.0))
            except ValueError:
                dur = 60.0
            total_duration_minutes += dur
        else:
            total_duration_minutes += 60.0 # Default 1 hr if unseeded

    estimated_hours = round(total_duration_minutes / 60.0, 1)
    weekly_study_hours = profile.last_known_weekly_hours if profile.last_known_weekly_hours and profile.last_known_weekly_hours > 0 else 10.0
    estimated_weeks = round(estimated_hours / weekly_study_hours, 1)
    # A standard bootcamp is about 12 weeks. If their pace takes more than 24 weeks (6 months) for a short path, warn them.
    # Alternatively, if they have a very constrained budget (e.g. 5 hours) and 400 hours path.
    time_budget_warning = estimated_weeks > 24.0
    
    # 8. Save and return new immutable PathVersion
    parent_stmt = select(PathVersion).where(PathVersion.profile_id == profile_id).order_by(PathVersion.created_at.desc())
    parent = (await db.execute(parent_stmt)).scalars().first()
    parent_id = parent.id if parent else None
    
    changed_nodes_data = {
        "active_skill": active_skill,
        "active_resource_id": active_resource.id if active_resource else None,
        "active_resource_title": active_resource.title if active_resource else None,
        "active_resource_url": active_resource.url if active_resource else None,
        "remaining_path": remaining_path,
        "completed_skills": completed_skills,
        "all_ordered_skills": all_ordered_skills,
    }
    
    trace_data = {
        "decision_trace": decision_trace,
        "explanation": explanation,
        "estimated_hours": estimated_hours,
        "estimated_weeks": estimated_weeks,
        "total_duration_minutes": total_duration_minutes,
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
    Computes Role Readiness using Graph Centrality Weighting (Feature 3):
    Foundational skills with many downstream dependents receive higher weight than leaf skills.
    
    readiness = weighted_skill_coverage * evidence_quality_factor * recency_factor * assessment_confidence
    """
    # 1. Build complete skill graph from Neo4j for centrality calculation
    G = nx.DiGraph()
    try:
        def fetch_graph_sync():
            import networkx as nx
            local_G = nx.DiGraph()
            with neo4j_client.driver.session() as session:
                nodes_res = session.run("MATCH (s:Skill) RETURN s.id AS id, s.name AS name")
                for r in nodes_res:
                    local_G.add_node(r["id"])
                edges_res = session.run("MATCH (pre:Skill)-[:PREREQUISITE_OF]->(s:Skill) RETURN pre.id AS pre_id, s.id AS s_id")
                for r in edges_res:
                    local_G.add_edge(r["pre_id"], r["s_id"])
            return local_G
            
        import asyncio
        G = await asyncio.to_thread(fetch_graph_sync)
    except Exception as e:
        logger.error(f"Error loading graph for readiness bar: {e}")

    total_nodes = len(G.nodes) if len(G.nodes) > 0 else 15

    # 2. Compute Graph Centrality Weights using NetworkX (PageRank on prerequisite influence)
    # Reversing graph gives higher PageRank to nodes that are prerequisite ancestors to many nodes
    skill_weights: Dict[str, float] = {}
    if len(G.nodes) > 0 and len(G.edges) > 0:
        try:
            # Foundational nodes have higher out-degree/prereq influence
            rev_G = G.reverse()
            pagerank_scores = nx.pagerank(rev_G, alpha=0.85)
            # Add base weight + descendant count for foundational emphasis
            for node in G.nodes:
                descendants_count = len(nx.descendants(G, node))
                centrality_val = pagerank_scores.get(node, 1.0 / total_nodes) + (descendants_count * 0.05)
                skill_weights[node] = centrality_val
        except Exception:
            skill_weights = {node: 1.0 for node in G.nodes}
    else:
        skill_weights = {f"skill_{i}": 1.0 for i in range(total_nodes)}

    # Normalize weights so sum is 1.0
    total_weight_sum = sum(skill_weights.values())
    if total_weight_sum > 0:
        skill_weights = {k: v / total_weight_sum for k, v in skill_weights.items()}

    # 3. Fetch readiness snapshots
    stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == profile_id)
    snapshots = (await db.execute(stmt)).scalars().all()
    
    mastered_skills = [s for s in snapshots if s.readiness_score >= 0.70]
    
    def get_node_weight(skill_id_str: str) -> float:
        for node in G.nodes:
            if node == skill_id_str or node.lower().replace(" ", "_") == skill_id_str.lower().replace(" ", "_"):
                return skill_weights.get(node, 1.0 / total_nodes)
        return skill_weights.get(skill_id_str, 1.0 / total_nodes)

    # 4. Calculate Weighted Skill Coverage (foundational skills count more)
    if skill_weights:
        mastered_weight_sum = sum(get_node_weight(s.skill_id) for s in mastered_skills)
        weighted_coverage = min(1.0, max(0.0, mastered_weight_sum))
    else:
        weighted_coverage = len(mastered_skills) / max(1, total_nodes)
    
    # 5. Evidence Quality Factor
    attempt_stmt = select(AssessmentAttempt).where(AssessmentAttempt.profile_id == profile_id)
    attempts = (await db.execute(attempt_stmt)).scalars().all()
    passed_attempts = [a for a in attempts if a.is_correct]
    evidence_factor = 0.5 + (min(len(passed_attempts), 10) / 20.0)
    
    # 6. Recency Factor
    if snapshots:
        latest_update = max(s.last_updated for s in snapshots).replace(tzinfo=timezone.utc)
        elapsed_days = (datetime.now(timezone.utc) - latest_update).total_seconds() / 86400.0
        recency_factor = max(0.5, math.exp(-elapsed_days / 60.0))
    else:
        recency_factor = 1.0
        
    # 7. Assessment Confidence Score
    if mastered_skills:
        avg_confidence = sum(s.readiness_score for s in mastered_skills) / len(mastered_skills)
    else:
        avg_confidence = DEFAULT_BKT_PRIOR
        
    # Final Weighted Readiness Score
    readiness_percentage = weighted_coverage * evidence_factor * recency_factor * avg_confidence
    
    return {
        "readiness_score": round(min(1.0, max(0.0, readiness_percentage)), 4),
        "skill_coverage": round(weighted_coverage, 4),
        "unweighted_coverage": round(len(mastered_skills) / max(1, total_nodes), 4),
        "evidence_factor": round(evidence_factor, 4),
        "recency_factor": round(recency_factor, 4),
        "avg_confidence": round(avg_confidence, 4),
        "mastered_count": len(mastered_skills),
        "total_skills": total_nodes
    }

