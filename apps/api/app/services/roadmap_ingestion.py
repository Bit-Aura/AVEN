import os
import re
import yaml
import logging
import networkx as nx
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy import select, update, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    SkillRecord,
    Resource,
    RoadmapCache,
    RoadmapIngestionConflict,
    RoleRoadmapMapping,
    ReadinessSnapshot,
    CodingSandboxSubmission,
    User
)
from app.infrastructure.roadmap_client import roadmap_client, RoadmapClient
from app.infrastructure.neo4j.client import neo4j_client, Neo4jClient

logger = logging.getLogger(__name__)

MAPPING_YAML_PATH = os.path.join(os.path.dirname(__file__), "..", "core", "roadmap_mapping.yaml")

def slugify_label(text: str) -> str:
    """Converts a label string into a clean lowercase slug identifier."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '_', text)
    return text.strip('_')

class RoadmapIngestionService:
    """
    Deterministic engine for ingesting, normalizing, validating, and upserting
    roadmap.sh topologies into PostgreSQL and Neo4j as canonical Skill DAGs.
    """

    def __init__(self, client: Optional[RoadmapClient] = None, neo4j: Optional[Neo4jClient] = None):
        self.client = client or roadmap_client
        self.neo4j = neo4j or neo4j_client

    # =========================================================================
    # Stage A: Role -> Roadmap Mapping Resolution
    # =========================================================================
    async def get_role_roadmap_slugs(self, role_id: str, db: AsyncSession) -> List[str]:
        """
        Resolves roadmap slugs for a role. First checks runtime Postgres table `role_roadmap_mappings`,
        falling back to default configuration in `roadmap_mapping.yaml`.
        """
        stmt = (
            select(RoleRoadmapMapping.roadmap_slug)
            .where(RoleRoadmapMapping.role_id == role_id)
            .order_by(RoleRoadmapMapping.priority_order.asc())
        )
        result = await db.execute(stmt)
        slugs = result.scalars().all()
        if slugs:
            return list(slugs)

        # Fallback to YAML configuration file
        if os.path.exists(MAPPING_YAML_PATH):
            try:
                with open(MAPPING_YAML_PATH, "r", encoding="utf-8") as f:
                    config = yaml.safe_load(f) or {}
                    if role_id in config:
                        return config[role_id]
            except Exception as e:
                logger.error(f"[RoadmapIngestion] Failed to read roadmap_mapping.yaml: {e}")

        # Default safety fallbacks
        default_mappings = {
            "backend_swe": ["backend", "python", "sql", "system-design"],
            "frontend_swe": ["frontend", "javascript", "react"],
            "devops_platform": ["devops", "docker", "kubernetes"],
            "mlops_engineer": ["mlops", "ai-engineer", "python"],
            "data_engineer": ["data-engineer", "sql", "python"],
        }
        return default_mappings.get(role_id, ["backend"])

    # =========================================================================
    # Stage B: Fetch & Cache Raw Roadmap Graph (Credit-Saving Guard)
    # =========================================================================
    async def fetch_and_cache_roadmap(self, slug: str, db: AsyncSession, force: bool = False) -> RoadmapCache:
        """
        Fetches roadmap details and clean nodes from roadmap.sh with aggressive caching.
        Skips live requests if cached source_updated_at is unchanged (saves API credits).
        """
        # 1. Fetch catalog metadata (1 credit total across catalog)
        available_roadmaps = await self.client.list_roadmaps()
        matched = next((r for r in available_roadmaps if r["slug"] == slug), None)
        source_updated_at_str = matched.get("updatedAt") if matched else None
        
        source_updated_at = None
        if source_updated_at_str:
            try:
                source_updated_at = datetime.fromisoformat(source_updated_at_str.replace("Z", "+00:00"))
            except Exception:
                source_updated_at = datetime.now(timezone.utc)

        # 2. Check existing cache row
        stmt = select(RoadmapCache).where(RoadmapCache.slug == slug)
        cached = (await db.execute(stmt)).scalar_one_or_none()

        if cached and not force:
            c_dt = cached.source_updated_at.replace(tzinfo=None) if cached.source_updated_at else None
            s_dt = source_updated_at.replace(tzinfo=None) if source_updated_at else None
            if c_dt and s_dt and c_dt >= s_dt:
                logger.info(f"[RoadmapIngestion] Cache hit for '{slug}'. Skipping remote fetch to preserve credits.")
                return cached

        # 3. Remote fetch for missing or updated roadmap
        logger.info(f"[RoadmapIngestion] Cache miss/stale for '{slug}'. Fetching detail + clean nodes from roadmap.sh...")
        credits_spent = 0
        raw_detail = await self.client.get_roadmap_detail(slug)
        credits_spent += 1

        clean_nodes = await self.client.get_clean_roadmap_nodes(slug)
        credits_spent += 1

        if not cached:
            cached = RoadmapCache(
                slug=slug,
                raw_detail_json=raw_detail,
                clean_nodes_json=clean_nodes,
                topics_json=None,
                fetched_at=datetime.now(timezone.utc),
                source_updated_at=source_updated_at or datetime.now(timezone.utc),
                credits_spent=credits_spent
            )
            db.add(cached)
        else:
            cached.raw_detail_json = raw_detail
            cached.clean_nodes_json = clean_nodes
            cached.fetched_at = datetime.now(timezone.utc)
            cached.source_updated_at = source_updated_at or datetime.now(timezone.utc)
            cached.credits_spent += credits_spent

        await db.commit()
        await db.refresh(cached)
        return cached

    # =========================================================================
    # Stage C: Normalize into Canonical Skill Records
    # =========================================================================
    def normalize_roadmap_nodes(self, slug: str, clean_nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normalizes hierarchical topic tree into canonical skill dictionary objects.
        ID format: {slug}::{slugified_label}
        """
        skills: List[Dict[str, Any]] = []

        def walk_node(node: Dict[str, Any], depth: int = 1, parent_id: Optional[str] = None):
            ext_id = node.get("id") or slugify_label(node.get("label", "topic"))
            skill_id = f"{slug}::{ext_id}"

            # Depth-based difficulty & estimated hours heuristics
            if depth <= 1:
                difficulty = "beginner"
                est_hours = 8.0
            elif depth == 2:
                difficulty = "intermediate"
                est_hours = 15.0
            else:
                difficulty = "advanced"
                est_hours = 24.0

            skill = {
                "id": skill_id,
                "name": node.get("label", skill_id),
                "description": node.get("description") or f"Learn {node.get('label')} as part of the {slug} curriculum.",
                "bkt_p_l0": 0.15,
                "bkt_p_t": 0.20,
                "bkt_p_s": 0.10,
                "bkt_p_g": 0.20,
                "difficulty": difficulty,
                "est_hours": est_hours,
                "source": "roadmap_sh",
                "roadmap_slug": slug,
                "external_node_id": ext_id,
                "depth": depth,
                "parent_id": parent_id,
                "raw_resources": node.get("resources", [])
            }
            skills.append(skill)

            for child in node.get("children", []):
                walk_node(child, depth=depth + 1, parent_id=skill_id)

        for top_node in clean_nodes:
            walk_node(top_node, depth=1)

        return skills

    # =========================================================================
    # Stage D: Edge Resolution & NetworkX Cycle Validation
    # =========================================================================
    def resolve_edges_and_validate_dag(
        self,
        slug: str,
        skills: List[Dict[str, Any]],
        raw_edges: List[Dict[str, Any]]
    ) -> Tuple[List[Tuple[str, str]], List[List[str]]]:
        """
        Resolves prerequisite edges (parent -> child) and validates DAG invariant using NetworkX.
        Returns (candidate_edges, detected_cycles).
        """
        G = nx.DiGraph()
        skill_id_map = {s["id"]: s for s in skills}
        ext_to_full_id = {s["external_node_id"]: s["id"] for s in skills}

        for s in skills:
            G.add_node(s["id"], name=s["name"])

        candidate_edges: List[Tuple[str, str]] = []

        # 1. Structural parent-child relationships from clean hierarchy
        for s in skills:
            if s["parent_id"] and s["parent_id"] in skill_id_map:
                candidate_edges.append((s["parent_id"], s["id"]))

        # 2. Sequential/visual edges from raw_edges if valid
        for e in raw_edges:
            src_ext = e.get("source")
            tgt_ext = e.get("target")
            if src_ext in ext_to_full_id and tgt_ext in ext_to_full_id:
                src_id = ext_to_full_id[src_ext]
                tgt_id = ext_to_full_id[tgt_ext]
                if src_id != tgt_id:
                    candidate_edges.append((src_id, tgt_id))

        # Deduplicate edges
        candidate_edges = list(set(candidate_edges))

        for u, v in candidate_edges:
            G.add_edge(u, v)

        # Cycle Validation using NetworkX
        cycles = list(nx.simple_cycles(G))
        if cycles:
            logger.error(f"[RoadmapIngestion] Cycle detected in roadmap '{slug}': {cycles}")

        return candidate_edges, cycles

    # =========================================================================
    # Stage E: Learning Resource Extraction
    # =========================================================================
    async def extract_and_upsert_resources(
        self,
        slug: str,
        skills: List[Dict[str, Any]],
        db: AsyncSession
    ) -> int:
        """
        Extracts learning resources from normalized skills and writes them into `resources` table
        with status='PENDING' for Admin review.
        """
        # Find system user for submitted_by_id
        user_stmt = select(User.id).limit(1)
        sys_user_id = (await db.execute(user_stmt)).scalar_one_or_none() or 1

        resources_added = 0
        for s in skills:
            for r in s.get("raw_resources", []):
                url = r.get("url")
                if not url:
                    continue

                # Check if resource already exists
                res_stmt = select(Resource).where(Resource.url == url)
                existing = (await db.execute(res_stmt)).scalar_one_or_none()

                if not existing:
                    r_type = r.get("type", "article")
                    modality = "article" if "article" in r_type else ("video" if "video" in r_type else "course")
                    
                    res_obj = Resource(
                        title=r.get("title", f"{s['name']} Guide"),
                        content=f"Resource for {s['name']} sourced from roadmap.sh ({slug}).",
                        url=url,
                        resource_type=modality,
                        skill_id=s["id"],
                        submitted_by_id=sys_user_id,
                        status="PENDING",
                        source_roadmap_slug=slug,
                        source_node_id=s["external_node_id"]
                    )
                    db.add(res_obj)
                    resources_added += 1

        await db.commit()
        return resources_added

    # =========================================================================
    # Stage F & G: Diff + Upsert into Neo4j & Postgres with Manual Overrides
    # =========================================================================
    async def diff_and_upsert_topology(
        self,
        slug: str,
        skills: List[Dict[str, Any]],
        edges: List[Tuple[str, str]],
        db: AsyncSession
    ) -> Tuple[int, int]:
        """
        Diffs and upserts skill nodes and prerequisite edges into Postgres and Neo4j.
        Preserves manual overrides (Stage G) and soft-deprecates removed skills with learner progress.
        """
        skills_upserted = 0

        for s in skills:
            skill_id = s["id"]
            name = s["name"]

            # Stage G Check: Fetch existing skill row
            stmt = select(SkillRecord).where(
                or_(SkillRecord.id == skill_id, SkillRecord.name == name)
            )
            existing_skill = (await db.execute(stmt)).scalar_one_or_none()

            if existing_skill:
                # Stage G: Manual override takes precedence on id/name collision
                if existing_skill.source == "manual":
                    logger.info(f"[RoadmapIngestion] Preserving manual skill override for '{existing_skill.id}'.")
                    continue

                # Update existing roadmap-derived skill
                existing_skill.name = name
                existing_skill.description = s["description"]
                existing_skill.roadmap_slug = slug
                existing_skill.external_node_id = s["external_node_id"]
                existing_skill.deprecated = False
                skills_upserted += 1
            else:
                # Insert new skill record
                new_skill = SkillRecord(
                    id=skill_id,
                    name=name,
                    description=s["description"],
                    bkt_p_l0=s["bkt_p_l0"],
                    bkt_p_t=s["bkt_p_t"],
                    bkt_p_s=s["bkt_p_s"],
                    bkt_p_g=s["bkt_p_g"],
                    source="roadmap_sh",
                    roadmap_slug=slug,
                    external_node_id=s["external_node_id"],
                    deprecated=False
                )
                db.add(new_skill)
                skills_upserted += 1

        # Check for removed skills that have attached learner history
        active_ids = {s["id"] for s in skills}
        slug_skills_stmt = select(SkillRecord).where(
            SkillRecord.roadmap_slug == slug,
            SkillRecord.source == "roadmap_sh"
        )
        existing_slug_skills = (await db.execute(slug_skills_stmt)).scalars().all()

        for old_skill in existing_slug_skills:
            if old_skill.id not in active_ids:
                # Check for readiness snapshots or sandbox submissions
                has_snapshots = (await db.execute(
                    select(ReadinessSnapshot.id).where(ReadinessSnapshot.skill_id == old_skill.id).limit(1)
                )).scalar_one_or_none()
                
                has_submissions = (await db.execute(
                    select(CodingSandboxSubmission.id).where(CodingSandboxSubmission.node_id == old_skill.id).limit(1)
                )).scalar_one_or_none()

                if has_snapshots or has_submissions:
                    logger.info(f"[RoadmapIngestion] Soft-deprecating skill '{old_skill.id}' due to existing learner history.")
                    old_skill.deprecated = True
                else:
                    await db.delete(old_skill)

        await db.commit()

        # Neo4j Upsert for Nodes & Edges
        edges_upserted = await self.sync_neo4j_subgraph(slug, skills, edges)

        return skills_upserted, edges_upserted

    async def sync_neo4j_subgraph(
        self,
        slug: str,
        skills: List[Dict[str, Any]],
        edges: List[Tuple[str, str]]
    ) -> int:
        """
        Merges skill nodes and prerequisite edges into Neo4j graph database.
        """
        try:
            # 1. Upsert Skill Nodes (MERGE by unique skill ID)
            node_cypher = """
            UNWIND $skills AS s
            MERGE (skill:Skill {id: s.id})
            SET skill.name = s.name,
                skill.description = s.description,
                skill.roadmap_slug = s.roadmap_slug,
                skill.bkt_p_l0 = s.bkt_p_l0,
                skill.bkt_p_t = s.bkt_p_t,
                skill.bkt_p_s = s.bkt_p_s,
                skill.bkt_p_g = s.bkt_p_g
            """
            await self.neo4j.execute_query(node_cypher, {"skills": skills})

            # 2. Re-create Prerequisite Edges for this slug
            edge_params = [{"pre_id": u, "skill_id": v} for u, v in edges]
            edge_cypher = """
            UNWIND $edges AS e
            MATCH (pre:Skill {id: e.pre_id})
            MATCH (skill:Skill {id: e.skill_id})
            MERGE (pre)-[:PREREQUISITE_OF]->(skill)
            """
            await self.neo4j.execute_query(edge_cypher, {"edges": edge_params})
            return len(edges)
        except Exception as e:
            logger.error(f"[RoadmapIngestion] Neo4j sync error for '{slug}': {e}")
            return 0

    # =========================================================================
    # Orchestrated End-to-End Sync for a Single Slug
    # =========================================================================
    async def sync_roadmap_slug(self, slug: str, db: AsyncSession, force: bool = False) -> Dict[str, Any]:
        """
        Runs full 7-stage ingestion pipeline for one roadmap slug.
        """
        logger.info(f"[RoadmapIngestion] Executing ingestion pipeline for roadmap slug: '{slug}'...")

        # Stage B: Fetch & Cache
        cache_row = await self.fetch_and_cache_roadmap(slug, db, force=force)
        clean_nodes = cache_row.clean_nodes_json or []
        raw_detail = cache_row.raw_detail_json or {}
        raw_edges = raw_detail.get("edges", [])

        # Stage C: Normalize
        skills = self.normalize_roadmap_nodes(slug, clean_nodes)

        # Stage D: Edge resolution & Cycle validation
        edges, cycles = self.resolve_edges_and_validate_dag(slug, skills, raw_edges)

        if cycles:
            # Conflict Alert Logging
            conflict = RoadmapIngestionConflict(
                slug=slug,
                conflict_type="cycle_detected",
                payload={"slug": slug, "cycles": cycles, "edges_count": len(edges)},
                resolved=False
            )
            db.add(conflict)
            await db.commit()
            logger.error(f"[RoadmapIngestion] Ingestion aborted for '{slug}' due to cycle detection.")
            return {
                "slug": slug,
                "status": "rejected_cycle_detected",
                "skills_upserted": 0,
                "edges_upserted": 0,
                "resources_extracted": 0,
                "cycles_detected": len(cycles),
                "conflicts_logged": 1,
                "credits_spent": cache_row.credits_spent
            }

        # Stage E: Resource extraction
        resources_added = await self.extract_and_upsert_resources(slug, skills, db)

        # Stage F & G: Diff & Upsert
        skills_upserted, edges_upserted = await self.diff_and_upsert_topology(slug, skills, edges, db)

        return {
            "slug": slug,
            "status": "success",
            "skills_upserted": skills_upserted,
            "edges_upserted": edges_upserted,
            "resources_extracted": resources_added,
            "cycles_detected": 0,
            "conflicts_logged": 0,
            "credits_spent": cache_row.credits_spent
        }

roadmap_ingestion_service = RoadmapIngestionService()
