import os
import pytest
import asyncio

os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "sqlite+aiosqlite:///./test_pathfinder.db")
os.environ["LLM_PROVIDER"] = "mock"
os.environ["ANTHROPIC_API_KEY"] = "mock-api-key"
os.environ["NEO4J_URI"] = "bolt://localhost:7687"
os.environ["NEO4J_USERNAME"] = "neo4j"
os.environ["NEO4J_PASSWORD"] = "password"

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Initialize all database tables from registered SQLAlchemy models for the test session.
    """
    db_file = "./test_pathfinder.db"
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass

    async def _init_tables():
        import app.models  # Ensures all models (including CodingSandboxSubmission, LearnerResume, MockInterviewSession) are registered on Base.metadata
        from app.core.db import engine
        from app.models.base import Base
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
            except Exception:
                pass

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_init_tables())
    finally:
        loop.close()
