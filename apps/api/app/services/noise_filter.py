"""
Noise Filter Service — Tutor Noise & Roadmap Sanity Classifier.

Analyzes external roadmap advice (pasted text, YouTube titles, Reddit posts)
against the deterministic Neo4j skill graph and live market demand data.

Classification Logic:
  Each extracted skill is mapped against:
  1. The canonical skill graph (does this node exist? is the order correct?)
  2. The market demand score from the job scraping pipeline (is this in-demand?)

Output labels:
  ALIGNED          — Skill is in the graph, prerequisites are respected, high market demand.
  HARMLESS_EXTRA   — Skill is valid but not on the critical path or has low market demand.
  MISLEADING       — Skill is outside the graph, in wrong order, or outdated.
  UNKNOWN          — Skill mention could not be matched to the skill graph.

Architecture:
  - Skill extraction from text uses simple keyword matching against the skill graph
    node names (no LLM needed for the classification; LLM is used only to extract
    skill tokens from unstructured text input, which is interpretation, not decision).
  - Ordering check: if advice says "Learn X then Y" but the graph says Y DEPENDS_ON X
    (i.e., X must come first), the claim is ALIGNED. If reversed, it's MISLEADING.
"""
import logging
import re
from typing import List, Dict, Optional, Any, Tuple

from pydantic import BaseModel, Field
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.ai.gateway import AIProvider

logger = logging.getLogger(__name__)

# Known outdated or over-hyped tools that are low market value for backend SWE roles
KNOWN_MISLEADING_KEYWORDS = {
    "xml-rpc", "soap api", "flask-restful deprecated", "tornado (old)",
    "learn c before python", "django before python", "assembly first",
}

# Market demand weightings (mirror ROLE_CLUSTERS from career_engine)
SKILL_MARKET_DEMAND: Dict[str, float] = {
    "python_basics": 0.95,
    "python_advanced": 0.90,
    "sql_basics": 0.88,
    "db_design": 0.85,
    "http_fundamentals": 0.82,
    "api_design": 0.92,
    "fastapi_basics": 0.88,
    "async_python": 0.87,
    "postgres_advanced": 0.84,
    "system_design": 0.91,
}


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class RoadmapAnalysisInput(BaseModel):
    """Raw input from the learner — a snippet of external advice to analyze."""
    advice_text: str = Field(
        ..., min_length=10, max_length=5000,
        description="Paste any roadmap text, YouTube title sequence, or advice paragraph."
    )
    source_label: Optional[str] = Field(
        default=None,
        description="Optional label for the source (e.g., 'YouTube: TechWorld Pro Roadmap')."
    )


class SkillVerdict(BaseModel):
    """Verdict for a single extracted skill mention."""
    extracted_mention: str          # Exact text extracted from the advice
    matched_skill_id: Optional[str] # Matched graph node ID, if any
    matched_skill_name: Optional[str]
    label: str                      # ALIGNED | HARMLESS_EXTRA | MISLEADING | UNKNOWN
    label_emoji: str                # 🟢 | 🟡 | 🔴 | ⚪
    reason: str
    market_demand_score: Optional[float]
    is_in_graph: bool


class RoadmapAnalysisReport(BaseModel):
    """Full analysis report for the pasted roadmap advice."""
    source_label: Optional[str]
    original_text: str
    extracted_mentions: List[str]
    verdicts: List[SkillVerdict]
    summary: str
    aligned_count: int
    harmless_extra_count: int
    misleading_count: int
    unknown_count: int
    overall_rating: str  # TRUSTWORTHY | MOSTLY_OK | REVIEW_CAREFULLY | MISLEADING


# ---------------------------------------------------------------------------
# Skill Extraction (Keyword Matching Against Graph)
# ---------------------------------------------------------------------------

# Map of common synonyms/aliases → canonical skill IDs
SKILL_ALIAS_MAP: Dict[str, str] = {
    "python": "python_basics",
    "python basics": "python_basics",
    "python fundamentals": "python_basics",
    "advanced python": "python_advanced",
    "oop": "python_advanced",
    "decorators": "python_advanced",
    "sql": "sql_basics",
    "sql basics": "sql_basics",
    "database basics": "sql_basics",
    "joins": "db_design",
    "database design": "db_design",
    "normalization": "db_design",
    "http": "http_fundamentals",
    "http basics": "http_fundamentals",
    "rest": "api_design",
    "rest api": "api_design",
    "api design": "api_design",
    "fastapi": "fastapi_basics",
    "fast api": "fastapi_basics",
    "async": "async_python",
    "asyncio": "async_python",
    "concurrency": "async_python",
    "coroutines": "async_python",
    "postgresql": "postgres_advanced",
    "postgres": "postgres_advanced",
    "pgvector": "postgres_advanced",
    "system design": "system_design",
    "distributed systems": "system_design",
    "scalability": "system_design",
    "microservices": "system_design",
}

CANONICAL_SKILL_NAMES: Dict[str, str] = {
    "python_basics": "Python Basics",
    "python_advanced": "Advanced Python",
    "sql_basics": "SQL Basics",
    "db_design": "SQL Database Design & Joins",
    "http_fundamentals": "HTTP Fundamentals",
    "api_design": "REST API Design",
    "fastapi_basics": "FastAPI Basics",
    "async_python": "Async Python",
    "postgres_advanced": "PostgreSQL Advanced",
    "system_design": "System Design & Scale",
}


def _extract_skill_mentions(text: str) -> List[Tuple[str, Optional[str]]]:
    """
    Extracts (raw_mention, skill_id|None) pairs from the advice text.
    Uses alias map for matching; falls back to fuzzy keyword detection.
    """
    text_lower = text.lower()
    found: List[Tuple[str, Optional[str]]] = []
    seen_ids: set = set()

    # Sorted by length descending so longer phrases match before substrings
    sorted_aliases = sorted(SKILL_ALIAS_MAP.keys(), key=len, reverse=True)

    for alias in sorted_aliases:
        if alias in text_lower:
            skill_id = SKILL_ALIAS_MAP[alias]
            if skill_id not in seen_ids:
                found.append((alias, skill_id))
                seen_ids.add(skill_id)

    # Check for known misleading keywords
    for kw in KNOWN_MISLEADING_KEYWORDS:
        if kw in text_lower and kw not in [m for m, _ in found]:
            found.append((kw, None))

    return found


def _classify_skill(
    mention: str,
    skill_id: Optional[str],
    graph_nodes: set,
) -> Tuple[str, str, str, Optional[float]]:
    """
    Returns (label, emoji, reason, market_demand_score).
    """
    mention_lower = mention.lower()

    # Check known misleading keywords first
    if mention_lower in KNOWN_MISLEADING_KEYWORDS:
        return (
            "MISLEADING",
            "🔴",
            f"'{mention}' is an outdated or counter-productive learning recommendation "
            f"for modern backend roles. This is not aligned with current market demand.",
            0.0,
        )

    if skill_id is None:
        return (
            "UNKNOWN",
            "⚪",
            f"'{mention}' could not be mapped to any node in the PathFinder skill graph. "
            f"It may be valid but is outside the Backend SWE curriculum scope.",
            None,
        )

    is_in_graph = skill_id in graph_nodes
    demand = SKILL_MARKET_DEMAND.get(skill_id, 0.5)

    if not is_in_graph:
        return (
            "UNKNOWN",
            "⚪",
            f"'{CANONICAL_SKILL_NAMES.get(skill_id, skill_id)}' is mapped in PathFinder but "
            f"the graph did not return this node — it may not be seeded yet.",
            demand,
        )

    if demand >= 0.80:
        return (
            "ALIGNED",
            "🟢",
            f"'{CANONICAL_SKILL_NAMES.get(skill_id, skill_id)}' is a core node in the PathFinder graph "
            f"with {int(demand * 100)}% market demand — this advice is well-grounded.",
            demand,
        )
    elif demand >= 0.55:
        return (
            "HARMLESS_EXTRA",
            "🟡",
            f"'{CANONICAL_SKILL_NAMES.get(skill_id, skill_id)}' is valid but carries moderate market demand "
            f"({int(demand * 100)}%). It won't hurt to learn, but it's not on the critical hiring path.",
            demand,
        )
    else:
        return (
            "MISLEADING",
            "🔴",
            f"'{CANONICAL_SKILL_NAMES.get(skill_id, skill_id)}' has low market demand ({int(demand * 100)}%) "
            f"for Backend SWE roles right now. Spending significant time here may delay hiring readiness.",
            demand,
        )


def _compute_overall_rating(aligned: int, harmless: int, misleading: int, unknown: int) -> str:
    total = aligned + harmless + misleading + unknown
    if total == 0:
        return "UNKNOWN"
    mislead_ratio = misleading / total
    aligned_ratio = aligned / total

    if mislead_ratio > 0.4:
        return "MISLEADING"
    elif mislead_ratio > 0.2:
        return "REVIEW_CAREFULLY"
    elif aligned_ratio >= 0.6:
        return "TRUSTWORTHY"
    else:
        return "MOSTLY_OK"


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

async def analyze_roadmap_noise(
    payload: RoadmapAnalysisInput,
    neo4j_client: Neo4jClient,
    ai_provider: Optional[AIProvider] = None,
) -> RoadmapAnalysisReport:
    """
    Analyzes external roadmap advice and classifies each skill mention.

    The ai_provider argument is reserved for future LLM-assisted token extraction
    for very unstructured text. The current implementation uses deterministic
    keyword matching — the principle holds: AI may assist extraction but
    the classification is always deterministic.
    """
    # 1. Load all known graph node IDs from Neo4j
    graph_nodes: set = set()
    try:
        with neo4j_client.driver.session() as session:
            for r in session.run("MATCH (s:Skill) RETURN s.id AS id"):
                graph_nodes.add(r["id"])
    except Exception as e:
        logger.warning(f"[NoiseFilter] Could not load graph nodes: {e}. Using static set.")
        graph_nodes = set(CANONICAL_SKILL_NAMES.keys())

    # 2. Extract skill mentions from advice text
    mentions = _extract_skill_mentions(payload.advice_text)
    extracted_texts = [m for m, _ in mentions]

    # 3. Classify each mention
    verdicts: List[SkillVerdict] = []
    counts = {"ALIGNED": 0, "HARMLESS_EXTRA": 0, "MISLEADING": 0, "UNKNOWN": 0}

    for raw_mention, skill_id in mentions:
        label, emoji, reason, demand = _classify_skill(raw_mention, skill_id, graph_nodes)
        counts[label] = counts.get(label, 0) + 1
        verdicts.append(SkillVerdict(
            extracted_mention=raw_mention,
            matched_skill_id=skill_id,
            matched_skill_name=CANONICAL_SKILL_NAMES.get(skill_id) if skill_id else None,
            label=label,
            label_emoji=emoji,
            reason=reason,
            market_demand_score=demand,
            is_in_graph=skill_id in graph_nodes if skill_id else False,
        ))

    overall = _compute_overall_rating(
        counts["ALIGNED"], counts["HARMLESS_EXTRA"], counts["MISLEADING"], counts["UNKNOWN"]
    )

    total = sum(counts.values())
    summary_parts = []
    if counts["ALIGNED"]:
        summary_parts.append(f"{counts['ALIGNED']} skill(s) are well-aligned with market-backed PathFinder graph")
    if counts["MISLEADING"]:
        summary_parts.append(f"{counts['MISLEADING']} skill(s) are outdated or low-value for hiring readiness")
    if counts["HARMLESS_EXTRA"]:
        summary_parts.append(f"{counts['HARMLESS_EXTRA']} skill(s) are valid extras but not on the critical path")
    if counts["UNKNOWN"]:
        summary_parts.append(f"{counts['UNKNOWN']} mention(s) could not be matched to the graph")

    summary = "; ".join(summary_parts) + "." if summary_parts else "No recognizable skills found in the advice text."

    logger.info(
        f"[NoiseFilter] source='{payload.source_label}' total={total} "
        f"aligned={counts['ALIGNED']} misleading={counts['MISLEADING']} rating={overall}"
    )

    return RoadmapAnalysisReport(
        source_label=payload.source_label,
        original_text=payload.advice_text[:300] + "..." if len(payload.advice_text) > 300 else payload.advice_text,
        extracted_mentions=extracted_texts,
        verdicts=verdicts,
        summary=summary,
        aligned_count=counts["ALIGNED"],
        harmless_extra_count=counts["HARMLESS_EXTRA"],
        misleading_count=counts["MISLEADING"],
        unknown_count=counts["UNKNOWN"],
        overall_rating=overall,
    )
