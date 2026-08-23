import logging
from typing import Any, Dict, List, Optional
from neo4j import GraphDatabase, Driver
from app.core.config import settings

logger = logging.getLogger(__name__)

class MockNeo4jDriver:
    def close(self):
        pass
    class _MockSession:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def execute_write(self, fn): return []
        def run(self, query, parameters=None):
            class MockRecord:
                def __init__(self, data):
                    self._data = data
                def __getitem__(self, key):
                    return self._data[key]
                def data(self):
                    return self._data

            if "RETURN s.id" in query:
                # Return nodes
                return [
                    MockRecord({"id": "python_basics", "name": "Python Basics", "description": "Python fundamentals"}),
                    MockRecord({"id": "sql_basics", "name": "SQL Basics", "description": "SQL basics"}),
                    MockRecord({"id": "api_design", "name": "REST API Design", "description": "API design"}),
                ]
            elif "RETURN pre.name" in query:
                # Return edges
                return [
                    MockRecord({"pre_name": "Python Basics", "skill_name": "SQL Basics"}),
                    MockRecord({"pre_name": "SQL Basics", "skill_name": "REST API Design"}),
                ]
            return []
            
    def session(self):
        return self._MockSession()

class Neo4jClient:
    def __init__(self) -> None:
        self._driver: Optional[Any] = None

    def connect(self) -> None:
        if not self._driver:
            try:
                driver = GraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
                )
                driver.verify_connectivity()
                self._driver = driver
                logger.info("Successfully connected to Neo4j database.")
            except Exception as e:
                logger.warning(f"Failed to connect to Neo4j database: {e}. Falling back to MockNeo4jDriver.")
                self._driver = MockNeo4jDriver()

    def close(self) -> None:
        if self._driver:
            self._driver.close()
            self._driver = None
            logger.info("Neo4j database connection closed.")

    @property
    def driver(self) -> Any:
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
