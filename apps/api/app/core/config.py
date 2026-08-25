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
    
    # ──────────────────────────────────────────────
    # LLM Provider Switch
    # ──────────────────────────────────────────────
    # Set to "antigravity" → free proxy via Antigravity reverse proxy
    # Set to "anthropic"   → direct Anthropic API (requires real key)
    # Set to "mock"        → deterministic mock responses (offline/test)
    LLM_PROVIDER: str = "antigravity"

    # Anthropic Direct API (only used when LLM_PROVIDER=anthropic)
    ANTHROPIC_API_KEY: str = "your_anthropic_api_key_here"

    # Antigravity Proxy (only used when LLM_PROVIDER=antigravity)
    #
    # Available models from your proxy dashboard:
    #   gemini-3.6-flash-high   | gemini-3.6-flash-medium  | gemini-3.6-flash-low
    #   gemini-3.5-flash-low    | gemini-3.5-flash-extra-low
    #   gemini-3.1-pro-high     | gemini-3.1-pro-low
    ANTIGRAVITY_PROXY_URL: str = "http://localhost:3001/v1"
    ANTIGRAVITY_MODEL: str = "gemini-3.6-flash-medium"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
