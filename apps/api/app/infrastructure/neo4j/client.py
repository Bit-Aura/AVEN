import logging
from typing import Any, Dict, List, Optional, AsyncGenerator
from neo4j import AsyncGraphDatabase, AsyncDriver, AsyncSession
from fastapi import Depends
from app.core.config import settings

logger = logging.getLogger(__name__)

class Neo4jClient:
    def __init__(self) -> None:
        self._driver: AsyncDriver | None = None

    async def connect(self) -> None:
        if not self._driver:
            try:
                self._driver = AsyncGraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
                    connection_timeout=2.0
                )
                await self._driver.verify_connectivity()
                logger.info("Successfully connected to Neo4j database.")
            except Exception as e:
                logger.error(f"Failed to connect to Neo4j database: {e}")
                raise

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
