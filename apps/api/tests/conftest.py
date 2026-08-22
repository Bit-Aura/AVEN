import os

# Set environment variables before any other imports to avoid Pydantic validation errors
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"
os.environ["ANTHROPIC_API_KEY"] = "mock-api-key"
os.environ["NEO4J_URI"] = "bolt://localhost:7687"
os.environ["NEO4J_USERNAME"] = "neo4j"
os.environ["NEO4J_PASSWORD"] = "password"
