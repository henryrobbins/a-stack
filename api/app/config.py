"""Runtime settings, read from the environment and a local `.env`."""

from pydantic_settings import BaseSettings, SettingsConfigDict

MODELS = ("claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    clerk_jwks_url: str = ""
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    anthropic_api_key: str = ""

    default_model: str = MODELS[0]
    max_tokens: int = 8192


settings = Settings()
