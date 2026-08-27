import pytest
import networkx as nx
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.orm import sessionmaker
from app.core.db import engine, AsyncSession
from app.services.roadmap_ingestion import RoadmapIngestionService
from app.scraper.reconciler import reconcile_scraped_skill_terms
from app.models.domain import SkillRecord, RoadmapCache, RoadmapIngestionConflict

@pytest.mark.asyncio
async def test_roadmap_normalization():
    service = RoadmapIngestionService(client=MagicMock(), neo4j=MagicMock())
    clean_nodes = [
        {
            "id": "intro",
            "label": "Introduction to Python",
            "type": "topic",
            "children": [
                {
                    "id": "funcs",
                    "label": "Functions & Scope",
                    "type": "subtopic",
                    "resources": [
                        {"title": "Python Docs", "url": "https://docs.python.org/3/", "type": "article"}
                    ]
                }
            ]
        }
    ]

    skills = service.normalize_roadmap_nodes("python", clean_nodes)
    assert len(skills) == 2
    assert skills[0]["id"] == "python::intro"
    assert skills[0]["difficulty"] == "beginner"
    assert skills[1]["id"] == "python::funcs"
    assert skills[1]["difficulty"] == "intermediate"
    assert skills[1]["parent_id"] == "python::intro"
    assert len(skills[1]["raw_resources"]) == 1

@pytest.mark.asyncio
async def test_dag_cycle_validation():
    service = RoadmapIngestionService(client=MagicMock(), neo4j=MagicMock())
    skills = [
        {"id": "s::a", "name": "A", "external_node_id": "a", "parent_id": None},
        {"id": "s::b", "name": "B", "external_node_id": "b", "parent_id": "s::a"},
        {"id": "s::c", "name": "C", "external_node_id": "c", "parent_id": "s::b"},
    ]

    # Valid DAG edges
    edges_clean, cycles_clean = service.resolve_edges_and_validate_dag("s", skills, [])
    assert len(cycles_clean) == 0

    # Inject cycle C -> A
    raw_edges_cyclic = [{"source": "c", "target": "a"}]
    edges_cyclic, cycles_detected = service.resolve_edges_and_validate_dag("s", skills, raw_edges_cyclic)
    assert len(cycles_detected) == 1
    assert "s::a" in cycles_detected[0]

@pytest.mark.asyncio
async def test_manual_override_preservation():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        service = RoadmapIngestionService(client=MagicMock(), neo4j=AsyncMock())
        
        # Cleanup if previously seeded
        existing = await db.get(SkillRecord, "backend::python_basics_manual")
        if existing:
            await db.delete(existing)
            await db.commit()

        # Seed manual skill
        manual_skill = SkillRecord(
            id="backend::python_basics_manual",
            name="Unique Custom Handcrafted Python Basics",
            description="Manual description",
            source="manual"
        )
        db.add(manual_skill)
        await db.commit()

        skills = [
            {
                "id": "backend::python_basics_manual",
                "name": "Upstream Python Basics",
                "description": "Upstream roadmap.sh description",
                "bkt_p_l0": 0.15, "bkt_p_t": 0.20, "bkt_p_s": 0.10, "bkt_p_g": 0.20,
                "external_node_id": "python_basics_manual",
                "source": "roadmap_sh"
            }
        ]

        upserted, _ = await service.diff_and_upsert_topology("backend", skills, [], db)
        assert upserted == 0

        # Verify manual skill remains untouched
        fetched = await db.get(SkillRecord, "backend::python_basics_manual")
        assert fetched is not None
        assert fetched.name == "Unique Custom Handcrafted Python Basics"
        assert fetched.source == "manual"

@pytest.mark.asyncio
async def test_scraper_unmapped_skill_reconciliation():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        res = await reconcile_scraped_skill_terms(
            job_id="job_123",
            company="Acme Corp",
            extracted_skill_terms=["Rust Concurrency", "Python Basics"],
            db=db
        )

        assert "unmapped_terms" in res
        assert "Rust Concurrency" in res["unmapped_terms"]
