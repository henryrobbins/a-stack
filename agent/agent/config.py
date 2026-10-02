"""Runtime settings. On Modal they come from the `a-stack-agent` secret."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_secret_key: str = ""
    anthropic_api_key: str = ""
    # Shared with the web app, which sends it as X-Trigger-Secret.
    agent_trigger_secret: str = ""

    max_turns: int = 12
    timeout_s: int = 600
    # How often the activity feed is written and cancellation is checked.
    activity_interval_s: float = 3.0


settings = Settings()
