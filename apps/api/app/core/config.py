from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Career PathFinder API"
    API_V1_STR: str = "/api/v1"
    
    # DB (PostgreSQL / SQLite for local development)
    DATABASE_URL: str = "sqlite+aiosqlite:///./pathfinder.db"
    
    # Neo4j Graph DB
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    
    # LLM Provider Key
    ANTHROPIC_API_KEY: str = "mock-key-local-development"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
