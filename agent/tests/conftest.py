"""Fixtures against the local Supabase instance (secret key, as the worker uses)."""

import json
import os
import subprocess
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest
from supabase import AsyncClient, acreate_client

# CI exports Supabase settings; locally they come from the running instance.
if "SUPABASE_SECRET_KEY" not in os.environ:
    _status = json.loads(
        subprocess.run(
            ["supabase", "status", "-o", "json"],
            cwd=Path(__file__).parents[2] / "supabase",
            capture_output=True,
            check=True,
            text=True,
        ).stdout
    )
    os.environ.update(
        SUPABASE_URL=_status["API_URL"],
        SUPABASE_SECRET_KEY=_status["SECRET_KEY"],
    )

from agent.db import RunStore, first  # noqa: E402


@dataclass(frozen=True)
class Owner:
    sub: str
    id: str


@pytest.fixture
async def admin() -> AsyncClient:
    return await acreate_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"]
    )


@pytest.fixture
def store(admin: AsyncClient) -> RunStore:
    return RunStore(admin)


@pytest.fixture
async def make_owner(
    admin: AsyncClient,
) -> AsyncIterator[Callable[[], Awaitable[Owner]]]:
    created: list[str] = []

    async def make() -> Owner:
        sub = f"test_user_{uuid.uuid4()}"
        row = first(await admin.table("users").insert({"clerk_user_id": sub}).execute())
        created.append(sub)
        return Owner(sub=sub, id=row["id"])

    yield make
    if created:
        await admin.table("users").delete().in_("clerk_user_id", created).execute()


async def queue_run(
    admin: AsyncClient, owner: Owner, tools: list[str] | None = None, **run: Any
) -> str:
    agent = first(
        await admin.table("agents")
        .insert(
            {
                "user_id": owner.id,
                "name": "Helper",
                "instructions": "Be helpful.",
                "tools": tools or [],
                "model": "claude-haiku-4-5",
            }
        )
        .execute()
    )
    row = first(
        await admin.table("agent_runs")
        .insert({"user_id": owner.id, "agent_id": agent["id"], "prompt": "hi", **run})
        .execute()
    )
    return str(row["id"])
