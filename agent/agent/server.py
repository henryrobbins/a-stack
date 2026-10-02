"""The trigger endpoint, shared by the Modal deployment and local development."""

import hmac
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel


class TriggerIn(BaseModel):
    run_id: str


def create_app(start: Callable[[str], Awaitable[None]], secret: str) -> FastAPI:
    """`POST /` with `{run_id}` and the shared secret in X-Trigger-Secret
    calls `start(run_id)`. Every request is refused if `secret` is empty."""
    app = FastAPI(title="a-stack-agent-trigger")

    @app.post("/")
    async def trigger(
        body: TriggerIn, x_trigger_secret: str = Header(default="")
    ) -> dict[str, bool]:
        if not secret or not hmac.compare_digest(x_trigger_secret, secret):
            raise HTTPException(status_code=401, detail="Invalid trigger secret")
        await start(body.run_id)
        return {"ok": True}

    return app
