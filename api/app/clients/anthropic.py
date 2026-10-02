import anthropic

from app.config import settings

# The SDK default is 2; more retries ride out bursts of rate limiting.
_MAX_RETRIES = 4
_TIMEOUT_S = 300.0


def get_anthropic_client() -> anthropic.AsyncAnthropic:
    """The Anthropic client used by request handlers (a FastAPI dependency)."""
    return anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        max_retries=_MAX_RETRIES,
        timeout=_TIMEOUT_S,
    )
