from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    GROQ_API_KEY: str
    APP_ENV: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
