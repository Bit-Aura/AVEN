"""
Skip Delta Engine — Live What-If-Skip Simulation with Target Date-Delta Calculation.

When a learner considers skipping skill S, this service:
  1. Retrieves all DESCENDANTS of S in the Neo4j/NetworkX DAG (nodes that become blocked).
  2. Computes friction penalty hours: downstream nodes become harder without S's foundation.
  3. Projects the exact calendar date change based on the learner's weekly study budget.

Math:
  base_hours = sum(hours(n) for n in current_path)
  friction_hours(S) = sum(base_hours(d) * friction_multiplier(d) for d in descendants(S))
  new_target_date = today + ((base_hours - hours(S) + friction_hours(S)) / weekly_budget) * 7 days
  delta_days = new_target_date - original_target_date
"""
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

import networkx as nx
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.domain import ReadinessSnapshot, Resource, ResourceMetadata
from app.infrastructure.neo4j.client import Neo4jClient

logger = logging.getLogger(__name__)

# Default hours for a skill with no resource data
DEFAULT_SKILL_HOURS = 5.0

# Friction multiplier: downstream skills take this much LONGER if their
# prerequisite was skipped (learner has to self-teach on the fly).
FRICTION_MULTIPLIER = 1.5


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class SkipDeltaInput(BaseModel):
    """Request payload for the live What-If-Skip simulation."""
    profile_id: int = Field(..., description="ID of the learner profile.")
    skipped_skill_id: str = Field(
        ..., description="The Neo4j Skill node ID to simulate skipping."
    )
    weekly_study_hours: float = Field(
        default=10.0,
        ge=1.0,
        le=80.0,
        description="The learner's real weekly study budget in hours."
    )


class BlockedNode(BaseModel):
    """A single downstream node that becomes unreachable if skill S is skipped."""
    skill_id: str
    skill_name: str
    estimated_hours: float
    friction_hours: float  # Additional penalty hours added due to missing prerequisite
    depth_from_skipped: int  # How many hops away from the skipped node in the DAG


class SkipDeltaReport(BaseModel):
    """Full simulation result returned to the frontend."""
    skipped_skill_id: str
    skipped_skill_name: str
    skipped_skill_hours: float

    blocked_nodes: List[BlockedNode]
    total_blocked_count: int

    # Hour calculations
    original_path_hours: float
    hours_saved_today: float
    total_friction_hours: float
    net_hour_change: float  # positive = more time needed; negative = time saved

    # Date calculations
    original_target_date: str   # ISO date string
    new_target_date: str        # ISO date string
    delta_days: int             # Positive = delay; negative = speedup

    # Human-readable verdict
    verdict: str
    is_recommended_to_skip: bool


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------

async def _get_skill_name(skill_id: str, neo4j_client: Neo4jClient) -> str:
    """Fetch human-readable skill name from Neo4j. Falls back to formatted ID."""
    try:
        with neo4j_client.driver.session() as session:
            res = session.run(
                "MATCH (s:Skill {id: $id}) RETURN s.name AS name", {"id": skill_id}
            ).single()
            if res and res["name"]:
                return res["name"]
    except Exception as e:
        logger.warning(f"Could not fetch skill name for {skill_id}: {e}")
    return skill_id.replace("_", " ").title()


async def _fetch_all_skill_hours(
    skill_ids: List[str],
    db: AsyncSession,
) -> Dict[str, float]:
    """
    Fetches estimated hours for a list of skill IDs from the resource metadata table.
    Falls back to DEFAULT_SKILL_HOURS when no resource exists.
    """
    hours_map: Dict[str, float] = {}
    for skill_id in skill_ids:
        try:
            stmt = (
                select(Resource)
                .join(ResourceMetadata, ResourceMetadata.resource_id == Resource.id)
                .where(ResourceMetadata.key == "skill_id", ResourceMetadata.value == skill_id)
                .options(selectinload(Resource.metadata_relations))
            )
            res_list = (await db.execute(stmt)).scalars().all()
            if res_list:
                meta_dict = {m.key: m.value for m in res_list[0].metadata_relations}
                raw_mins = meta_dict.get("duration_minutes", str(DEFAULT_SKILL_HOURS * 60))
                try:
                    hours = float(raw_mins) / 60.0
                except ValueError:
                    hours = DEFAULT_SKILL_HOURS
            else:
                hours = DEFAULT_SKILL_HOURS
        except Exception as e:
            logger.debug(f"Hours fetch failed for {skill_id}: {e}")
            hours = DEFAULT_SKILL_HOURS
        hours_map[skill_id] = round(hours, 2)
    return hours_map


def _build_full_graph(neo4j_client: Neo4jClient) -> nx.DiGraph:
    """
    Builds the complete skill DAG from Neo4j using skill IDs as node keys.
    Edges go from prerequisite → dependent (same direction as learning order).
    """
    G = nx.DiGraph()
    try:
        with neo4j_client.driver.session() as session:
            # Nodes
            for r in session.run("MATCH (s:Skill) RETURN s.id AS id, s.name AS name"):
                G.add_node(r["id"], name=r["name"])
            # Edges: PREREQUISITE_OF means pre → skill (pre must come before skill)
            for r in session.run(
                "MATCH (pre:Skill)-[:PREREQUISITE_OF]->(s:Skill) RETURN pre.id AS pre, s.id AS s"
            ):
                G.add_edge(r["pre"], r["s"])
    except Exception as e:
        logger.error(f"[SkipDelta] Failed to build graph from Neo4j: {e}")
    return G


def _project_date(total_hours: float, weekly_hours: float) -> datetime:
    """Project a target date given a study budget. Returns a UTC datetime."""
    if weekly_hours <= 0:
        weekly_hours = 10.0
    days_needed = math.ceil((total_hours / weekly_hours) * 7)
    return datetime.now(timezone.utc) + timedelta(days=days_needed)


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

async def compute_skip_delta(
    payload: SkipDeltaInput,
    db: AsyncSession,
    neo4j_client: Neo4jClient,
) -> SkipDeltaReport:
    """
    Full What-If-Skip computation pipeline.

    Steps:
    1. Load the complete DAG from Neo4j into NetworkX.
    2. Find all descendants of the skipped skill (blocked nodes).
    3. Fetch estimated hours for each node.
    4. Compute friction penalty.
    5. Compute original vs. new projected target dates.
    6. Build the human-readable verdict.
    """
    G = _build_full_graph(neo4j_client)
    skipped_id = payload.skipped_skill_id

    # --- Verify skill exists in graph ---
    if skipped_id not in G:
        logger.warning(f"[SkipDelta] Skill '{skipped_id}' not found in graph. Returning zero-impact report.")
        skipped_name = await _get_skill_name(skipped_id, neo4j_client)
        now_str = datetime.now(timezone.utc).date().isoformat()
        return SkipDeltaReport(
            skipped_skill_id=skipped_id,
            skipped_skill_name=skipped_name,
            skipped_skill_hours=DEFAULT_SKILL_HOURS,
            blocked_nodes=[],
            total_blocked_count=0,
            original_path_hours=0.0,
            hours_saved_today=0.0,
            total_friction_hours=0.0,
            net_hour_change=0.0,
            original_target_date=now_str,
            new_target_date=now_str,
            delta_days=0,
            verdict="This skill was not found in the learning graph. No downstream impact detected.",
            is_recommended_to_skip=False,
        )

    # --- Fetch learner's current unmastered path for context ---
    unmastered_ids: List[str] = []
    try:
        stmt = select(ReadinessSnapshot).where(
            ReadinessSnapshot.profile_id == payload.profile_id,
            ReadinessSnapshot.readiness_score < 0.70
        )
        low_snaps = (await db.execute(stmt)).scalars().all()
        unmastered_ids = [s.skill_id for s in low_snaps]
    except Exception as e:
        logger.debug(f"[SkipDelta] Could not fetch snapshots: {e}")

    # Get all nodes in topological order to compute "remaining path"
    all_topo: List[str] = []
    try:
        all_topo = list(nx.topological_sort(G))
    except nx.NetworkXUnfeasible:
        all_topo = list(G.nodes)

    # Remaining path = topological order, excluding already mastered skills
    remaining_path = [
        n for n in all_topo
        if n in G and (n in unmastered_ids or not unmastered_ids)
    ]

    # --- Gather all skill IDs we need hour data for ---
    descendants_set = nx.descendants(G, skipped_id)
    all_ids_needed = list({skipped_id} | descendants_set | set(remaining_path))
    hours_map = await _fetch_all_skill_hours(all_ids_needed, db)

    skipped_hours = hours_map.get(skipped_id, DEFAULT_SKILL_HOURS)
    skipped_name = G.nodes[skipped_id].get("name", skipped_id.replace("_", " ").title())

    # --- Original path hours (all unmastered remaining skills) ---
    original_path_hours = sum(hours_map.get(s, DEFAULT_SKILL_HOURS) for s in remaining_path)

    # --- Compute blocked node details with depth from skipped ---
    blocked_nodes: List[BlockedNode] = []
    for desc_id in descendants_set:
        if desc_id not in G:
            continue
        desc_name = G.nodes[desc_id].get("name", desc_id.replace("_", " ").title())
        desc_hours = hours_map.get(desc_id, DEFAULT_SKILL_HOURS)
        friction = round(desc_hours * FRICTION_MULTIPLIER - desc_hours, 2)  # additional penalty only

        # Compute shortest-path depth from skipped → desc
        try:
            depth = nx.shortest_path_length(G, skipped_id, desc_id)
        except nx.NetworkXNoPath:
            depth = 1

        blocked_nodes.append(BlockedNode(
            skill_id=desc_id,
            skill_name=desc_name,
            estimated_hours=desc_hours,
            friction_hours=friction,
            depth_from_skipped=depth,
        ))

    # Sort blocked nodes by depth (closest first)
    blocked_nodes.sort(key=lambda n: n.depth_from_skipped)

    # --- Total friction hours (over all blocked descendants) ---
    total_friction_hours = round(sum(n.friction_hours for n in blocked_nodes), 2)

    # --- Net hour change:
    #   We save hours(S) today but incur friction on all descendants
    hours_saved_today = skipped_hours
    net_hour_change = round(total_friction_hours - hours_saved_today, 2)

    # --- Date projections ---
    original_date = _project_date(original_path_hours, payload.weekly_study_hours)

    # New hours = original - hours(S) + friction (we still do descendants, just harder)
    new_total_hours = max(0.0, original_path_hours - skipped_hours + total_friction_hours)
    new_date = _project_date(new_total_hours, payload.weekly_study_hours)

    delta_days = (new_date.date() - original_date.date()).days

    # --- Human-readable verdict ---
    if not blocked_nodes:
        verdict = (
            f"Skipping **{skipped_name}** has no downstream consequences in the current graph. "
            f"You would save approximately {hours_saved_today:.1f} hours with no identified risk."
        )
        is_recommended = True
    elif net_hour_change <= 0:
        verdict = (
            f"Skipping **{skipped_name}** is neutral-to-positive. "
            f"It blocks {len(blocked_nodes)} downstream skill{'s' if len(blocked_nodes) != 1 else ''}, "
            f"but the net time impact is {abs(net_hour_change):.1f} hours SAVED "
            f"(your target date improves by {abs(delta_days)} day{'s' if abs(delta_days) != 1 else ''})."
        )
        is_recommended = True
    else:
        verdict = (
            f"Skipping **{skipped_name}** saves {hours_saved_today:.1f} hours today, "
            f"but blocks {len(blocked_nodes)} downstream skill{'s' if len(blocked_nodes) != 1 else ''} "
            f"and adds {total_friction_hours:.1f} friction hours. "
            f"Net impact: **+{delta_days} day{'s' if delta_days != 1 else ''} delay** "
            f"(from {original_date.date().isoformat()} to {new_date.date().isoformat()})."
        )
        is_recommended = delta_days <= 3  # Marginal skips under 3-day delay may be reasonable

    logger.info(
        f"[SkipDelta] profile={payload.profile_id} skill={skipped_id} "
        f"blocked={len(blocked_nodes)} friction={total_friction_hours}h delta={delta_days}d"
    )

    return SkipDeltaReport(
        skipped_skill_id=skipped_id,
        skipped_skill_name=skipped_name,
        skipped_skill_hours=skipped_hours,
        blocked_nodes=blocked_nodes,
        total_blocked_count=len(blocked_nodes),
        original_path_hours=round(original_path_hours, 2),
        hours_saved_today=hours_saved_today,
        total_friction_hours=total_friction_hours,
        net_hour_change=net_hour_change,
        original_target_date=original_date.date().isoformat(),
        new_target_date=new_date.date().isoformat(),
        delta_days=delta_days,
        verdict=verdict,
        is_recommended_to_skip=is_recommended,
    )
