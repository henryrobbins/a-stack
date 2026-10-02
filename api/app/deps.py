"""Request-scoped dependencies."""

import httpx
from fastapi import Depends
from supabase import AsyncClient, AsyncClientOptions, acreate_client

from app.auth import ClerkUser, verify_clerk_token
from app.config import settings

# Each request gets its own Supabase client (it carries the caller's token),
# but they share one connection pool rather than opening and leaking their own.
_http = httpx.AsyncClient(timeout=30.0)


async def get_supabase(user: ClerkUser = Depends(verify_clerk_token)) -> AsyncClient:
    """A Supabase client that acts as the caller, so every query is under RLS."""
    return await acreate_client(
        settings.supabase_url,
        settings.supabase_publishable_key,
        options=AsyncClientOptions(
            headers={"Authorization": f"Bearer {user.token}"},
            auto_refresh_token=False,
            persist_session=False,
            httpx_client=_http,
        ),
    )
