"""The trigger endpoint for local development, executing runs in-process.

A Modal container cannot reach a local Supabase stack, so `make dev` serves
the same endpoint with uvicorn and runs agents in this process instead.
"""

import asyncio

from agent.config import settings
from agent.db import RunStore
from agent.runner import execute
from agent.server import create_app

# Strong references, so in-flight runs are not garbage collected.
_running: set[asyncio.Task[None]] = set()


async def _start(run_id: str) -> None:
    store = await RunStore.connect(settings.supabase_url, settings.supabase_secret_key)
    task = asyncio.create_task(execute(store, run_id, settings))
    _running.add(task)
    task.add_done_callback(_running.discard)


app = create_app(_start, settings.agent_trigger_secret)
