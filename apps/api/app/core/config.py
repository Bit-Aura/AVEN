from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Career PathFinder API"
    API_V1_STR: str = "/api/v1"
    
    # DB (PostgreSQL)
    DATABASE_URL: str
    
    # Neo4j Graph DB
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    
    # LLM
    ANTHROPIC_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
