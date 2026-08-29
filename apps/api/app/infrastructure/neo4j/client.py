    import logging
from typing import Any, Dict, List, Optional, AsyncGenerator
from neo4j import AsyncGraphDatabase, AsyncDriver, AsyncSession
from fastapi import Depends
from app.core.config import settings

logger = logging.getLogger(__name__)

class Neo4jClient:
    def __init__(self) -> None:
        self._driver: AsyncDriver | None = None

    @property
    def driver(self):
        return self._driver

    async def connect(self) -> None:
        import asyncio
        if not self._driver:
            for attempt in range(5):
                try:
                    self._driver = AsyncGraphDatabase.driver(
                        settings.NEO4J_URI,
                        auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
                        connection_timeout=5.0
                    )
                    await self._driver.verify_connectivity()
                    logger.info("Successfully connected to Neo4j database.")
                    return
                except Exception as e:
                    logger.warning(f"Neo4j connection attempt {attempt + 1} failed: {e}")
                    if attempt == 4:
                        logger.error("Failed to connect to Neo4j database after retries.")
                        raise
                    await asyncio.sleep(2 ** attempt)

    async def close(self) -> None:
        if self._driver:
            await self._driver.close()
            self._driver = None
            logger.info("Neo4j database connection closed.")

neo4j_client = Neo4jClient()

async def get_neo4j_session() -> AsyncGenerator[AsyncSession, None]:
    if not neo4j_client._driver:
        await neo4j_client.connect()
    session = neo4j_client._driver.session()
    try:
        yield session
    finally:
        await session.close()
