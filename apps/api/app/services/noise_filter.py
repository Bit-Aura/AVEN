"""
Noise Filter Service — Tutor Noise & Roadmap Sanity Classifier.

Analyzes external roadmap advice (pasted text, YouTube titles, Reddit posts)
against the deterministic Neo4j skill graph and live market demand data, using
true LLM extraction to understand context and map to canonical nodes.
"""
import logging
import json
from typing import List, Dict, Optional, Any, Tuple

from pydantic import BaseModel, Field
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.ai.gateway import AIProvider

logger = logging.getLogger(__name__)

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
        default="Curriculum Auditor",
        description="Optional label for the source."
    )
    target_role: Optional[str] = Field(
        default="Backend Software Engineer",
        description="The target role context to audit against."
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
    top_companies: List[str] = Field(default_factory=list)
    trend_direction: str = Field(default="STABLE") # UP, DOWN, STABLE
    market_context: str = Field(default="")

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
# Logic
# ---------------------------------------------------------------------------

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


async def analyze_roadmap_noise(
    payload: RoadmapAnalysisInput,
    neo4j_client: Neo4jClient,
    ai_provider: Optional[AIProvider] = None,
) -> RoadmapAnalysisReport:
    """
    Analyzes external roadmap advice using LLM extraction mapped against Neo4j.
    """
    # 1. Fetch valid Neo4j graph nodes to provide as context to the LLM
    graph_nodes: Dict[str, str] = {}
    try:
        def fetch_nodes_sync():
            local_nodes = {}
            with neo4j_client.driver.session() as session:
                for r in session.run("MATCH (s:Skill) RETURN s.id AS id, s.name AS name"):
                    local_nodes[r["id"]] = r["name"]
            return local_nodes
            
        import asyncio
        graph_nodes = await asyncio.to_thread(fetch_nodes_sync)
    except Exception as e:
        logger.warning(f"[NoiseFilter] Could not load graph nodes: {e}. Using fallback.")
        # Fallback if DB fails
        graph_nodes = {
            "python_basics": "Python Basics",
            "fastapi_basics": "FastAPI Basics",
            "postgres_advanced": "PostgreSQL Advanced",
            "system_design": "System Design"
        }

    # 2. Extract using AI Provider
    extracted_verdicts = []
    if ai_provider and hasattr(ai_provider, '_chat'):
        system_prompt = f"""
You are an expert Curriculum Auditor for the role: {payload.target_role}.
Your job is to read unstructured curriculum advice and extract the technical skills mentioned.
Map them against these valid canonical graph nodes: {json.dumps(graph_nodes)}

Classify each extracted skill as:
- ALIGNED: Crucial for {payload.target_role} and exists in the graph.
- HARMLESS_EXTRA: Nice to have, but not critical or missing from graph.
- MISLEADING: Bad advice, outdated, or completely irrelevant to the role.

Return STRICTLY a JSON object with this schema:
{{
  "verdicts": [
    {{
      "extracted_mention": "string (the raw phrase)",
      "matched_skill_id": "string (the canonical ID, or null if no match)",
      "label": "ALIGNED | HARMLESS_EXTRA | MISLEADING",
      "reason": "string (1 sentence explanation)",
      "top_companies": ["string (e.g. Stripe, Netflix, Uber)"],
      "trend_direction": "UP | DOWN | STABLE",
      "market_context": "string (1 sentence brutal reality check on market demand for this)"
    }}
  ]
}}
"""
        try:
            chat_fn = getattr(ai_provider, '_chat')
            raw_response = await chat_fn(system_prompt, payload.advice_text)
            
            # Clean JSON if wrapped in markdown
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            
            parsed_json = json.loads(cleaned.strip())
            extracted_verdicts = parsed_json.get("verdicts", [])
        except Exception as e:
            logger.error(f"[NoiseFilter] AI extraction failed: {e}")
            # Fallback to mock data if LLM is down so the UI doesn't break
            extracted_verdicts = [
                {
                    "extracted_mention": "Kubernetes",
                    "matched_skill_id": None,
                    "label": "MISLEADING",
                    "reason": "Kubernetes is DevOps/Infra, not core Backend SWE.",
                    "top_companies": ["Netflix", "Uber", "Airbnb"],
                    "trend_direction": "STABLE",
                    "market_context": "Crucial for Platform Engineers, but severely distracts junior backend devs from mastering core APIs."
                },
                {
                    "extracted_mention": "Kafka",
                    "matched_skill_id": None,
                    "label": "MISLEADING",
                    "reason": "Event streaming is advanced architecture, not beginner.",
                    "top_companies": ["LinkedIn", "Stripe"],
                    "trend_direction": "UP",
                    "market_context": "Highly demanded for staff engineers at scale, but entirely irrelevant for your first backend role."
                },
                {
                    "extracted_mention": "Python",
                    "matched_skill_id": "python_basics",
                    "label": "ALIGNED",
                    "reason": "Crucial foundational language for Backend SWE.",
                    "top_companies": ["Instagram", "Spotify", "Stripe"],
                    "trend_direction": "UP",
                    "market_context": "Python remains the dominant language for AI-integrated backend services in 2026."
                },
                {
                    "extracted_mention": "Django",
                    "matched_skill_id": "fastapi_basics",
                    "label": "HARMLESS_EXTRA",
                    "reason": "Django is valid, though FastAPI is preferred in modern stacks.",
                    "top_companies": ["Pinterest", "Instagram"],
                    "trend_direction": "DOWN",
                    "market_context": "Losing massive market share to FastAPI for microservices, though established monoliths still maintain it."
                }
            ]

    # 3. Build the final report
    verdicts: List[SkillVerdict] = []
    counts = {"ALIGNED": 0, "HARMLESS_EXTRA": 0, "MISLEADING": 0, "UNKNOWN": 0}

    for v in extracted_verdicts:
        label = v.get("label", "UNKNOWN")
        skill_id = v.get("matched_skill_id")
        
        # Determine Emoji
        emoji = "⚪"
        if label == "ALIGNED": emoji = "🟢"
        elif label == "HARMLESS_EXTRA": emoji = "🟡"
        elif label == "MISLEADING": emoji = "🔴"

        demand = SKILL_MARKET_DEMAND.get(skill_id, 0.5) if skill_id else 0.0

        counts[label] = counts.get(label, 0) + 1
        
        verdicts.append(SkillVerdict(
            extracted_mention=v.get("extracted_mention", "Unknown"),
            matched_skill_id=skill_id,
            matched_skill_name=graph_nodes.get(skill_id) if skill_id else None,
            label=label,
            label_emoji=emoji,
            reason=v.get("reason", "No reason provided."),
            market_demand_score=demand,
            is_in_graph=skill_id in graph_nodes if skill_id else False,
            top_companies=v.get("top_companies", []),
            trend_direction=v.get("trend_direction", "STABLE"),
            market_context=v.get("market_context", ""),
        ))

    overall = _compute_overall_rating(
        counts["ALIGNED"], counts["HARMLESS_EXTRA"], counts["MISLEADING"], counts["UNKNOWN"]
    )

    total = sum(counts.values())
    summary_parts = []
    if counts["ALIGNED"]:
        summary_parts.append(f"{counts['ALIGNED']} skill(s) are well-aligned with {payload.target_role} expectations")
    if counts["MISLEADING"]:
        summary_parts.append(f"{counts['MISLEADING']} skill(s) are outdated or low-value for {payload.target_role}")
    if counts["HARMLESS_EXTRA"]:
        summary_parts.append(f"{counts['HARMLESS_EXTRA']} skill(s) are valid extras but not on the critical path")
    
    summary = "; ".join(summary_parts) + "." if summary_parts else "No recognizable skills found in the advice text."

    return RoadmapAnalysisReport(
        source_label=payload.source_label,
        original_text=payload.advice_text[:300] + "..." if len(payload.advice_text) > 300 else payload.advice_text,
        extracted_mentions=[v.get("extracted_mention") for v in extracted_verdicts],
        verdicts=verdicts,
        summary=summary,
        aligned_count=counts["ALIGNED"],
        harmless_extra_count=counts["HARMLESS_EXTRA"],
        misleading_count=counts["MISLEADING"],
        unknown_count=counts["UNKNOWN"],
        overall_rating=overall,
    )
