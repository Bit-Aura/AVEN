from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Career PathFinder API"
    API_V1_STR: str = "/api/v1"
    
    # DB
    DATABASE_URL: str
    
    # LLM
    ANTHROPIC_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
