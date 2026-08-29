from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.infrastructure.neo4j.client import neo4j_client
from app.infrastructure.ai.gateway import create_ai_provider
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
ai_provider = create_ai_provider()

@router.get("/health")
async def health_check():
    """
    Standard service health check endpoint.
    """
    return {"status": "ok", "provider": ai_provider.__class__.__name__}

@router.post("/api/v1/seed")
async def seed_databases(db: AsyncSession = Depends(get_db)):
    """
    Seeds Postgres and Neo4j databases with default skills, resources, and quizzes.
    """
    from app.services.seeder import seed_all
    try:
        await seed_all(db, neo4j_client)
        return {"status": "success", "message": "Databases successfully seeded!"}
    except Exception as e:
        logger.exception("Database seeding failed")
        raise HTTPException(status_code=500, detail=f"Database seeding failed: {e}")
