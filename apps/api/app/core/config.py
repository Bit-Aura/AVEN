from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Career PathFinder API"
    API_V1_STR: str = "/api/v1"
    
    # DB (PostgreSQL / SQLite for local development)
    DATABASE_URL: str = "sqlite+aiosqlite:///./pathfinder.db"
    DATABASE_URL_UNPOOLED: str | None = None

    
    # Neo4j Graph DB
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    
    # ──────────────────────────────────────────────
    # LLM Provider Switch
    # ──────────────────────────────────────────────
    # Set to "ollama"      → local Ollama instance (e.g. llama3:latest, qwen2.5-coder:14b)
    # Set to "antigravity" → free proxy via Antigravity reverse proxy
    # Set to "claude" / "anthropic" → Claude LLMsRelay / Anthropic API
    # Set to "mock"        → deterministic mock responses (offline/test)
    LLM_PROVIDER: str = "ollama"

    # Claude / LLMsRelay API Configuration (Backend-only, never exposed to frontend)
    CLAUDE_API_KEY: str = ""
    CLAUDE_BASE_URL: str = "https://api.llmsrelay.com"
    CLAUDE_MODEL: str = "claude-sonnet-5"

    # Anthropic Direct API (kept for backward compatibility)
    ANTHROPIC_API_KEY: str = "your_anthropic_api_key_here"

    # Ollama Local LLM (only used when LLM_PROVIDER=ollama)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:14b"

    # Antigravity Proxy (only used when LLM_PROVIDER=antigravity)
    #
    # Available models from your proxy dashboard:
    #   gemini-3.6-flash-high   | gemini-3.6-flash-medium  | gemini-3.6-flash-low
    #   gemini-3.5-flash-low    | gemini-3.5-flash-extra-low
    #   gemini-3.1-pro-high     | gemini-3.1-pro-low
    ANTIGRAVITY_PROXY_URL: str = "http://localhost:3001/v1"
    ANTIGRAVITY_MODEL: str = "gemini-3.6-flash-medium"

    # roadmap.sh API Key for Canonical Topology Ingestion
    ROADMAP_SH_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
