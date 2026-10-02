"""Modal app: a trigger endpoint that accepts runs and a function that executes
them. `make serve` runs it with live reload; `make deploy` deploys it."""

from pathlib import Path

import modal
from fastapi import FastAPI

from agent.config import settings

PROJECT_DIR = Path(__file__).parent.parent

app = modal.App("a-stack-agent")
image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_sync(str(PROJECT_DIR))
    .add_local_python_source("agent")
)
secrets = [modal.Secret.from_name("a-stack-agent")]


@app.function(image=image, secrets=secrets, timeout=settings.timeout_s + 60)
async def run_agent(run_id: str) -> None:
    from agent.db import RunStore
    from agent.runner import execute

    store = await RunStore.connect(settings.supabase_url, settings.supabase_secret_key)
    await execute(store, run_id, settings)


@app.function(image=image, secrets=secrets)
@modal.asgi_app()
def trigger() -> FastAPI:
    from agent.server import create_app

    async def start(run_id: str) -> None:
        await run_agent.spawn.aio(run_id)

    return create_app(start, settings.agent_trigger_secret)
