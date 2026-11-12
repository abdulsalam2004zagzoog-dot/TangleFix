from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://tanglefix:tanglefix_dev_password@localhost:5432/tanglefix"
    secret_key: str = "development-only-change-me"
    access_token_minutes: int = 1440
    cors_origins: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
