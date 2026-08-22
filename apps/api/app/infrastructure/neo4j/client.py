import logging
from typing import Any, Dict, List, Optional
from neo4j import GraphDatabase, Driver
from app.core.config import settings

logger = logging.getLogger(__name__)

class Neo4jClient:
    def __init__(self) -> None:
        self._driver: Optional[Driver] = None

    def connect(self) -> None:
        if not self._driver:
            try:
                self._driver = GraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
                )
                logger.info("Successfully connected to Neo4j database.")
            except Exception as e:
                logger.error(f"Failed to connect to Neo4j database: {e}")
                raise e

    def close(self) -> None:
        if self._driver:
            self._driver.close()
            self._driver = None
            logger.info("Neo4j database connection closed.")

    @property
    def driver(self) -> Driver:
        if not self._driver:
            self.connect()
        assert self._driver is not None
        return self._driver

    async def execute_query(
        self, query: str, parameters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes a Cypher query and returns the results.
        """
        driver = self.driver
        # Use sync execution inside an executor or simple blocking call since neo4j driver is thread-safe
        # For simplicity in this scaffolding, we run standard session query.
        def _run(tx):
            result = tx.run(query, parameters or {})
            return [record.data() for record in result]

        with driver.session() as session:
            return session.execute_write(_run)

neo4j_client = Neo4jClient()
