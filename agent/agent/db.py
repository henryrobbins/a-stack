"""Run bookkeeping in Supabase.

The worker acts on behalf of a run rather than a live user session, so it
uses the secret key (RLS does not apply). Every lookup of user data is
therefore scoped to the run's owner explicitly.
"""

from datetime import UTC, datetime
from typing import Any, cast

from postgrest import APIResponse
from supabase import AsyncClient, acreate_client

Row = dict[str, Any]
BUCKET = "uploads"


def rows(response: APIResponse) -> list[Row]:
    return cast(list[Row], response.data)


def first(response: APIResponse) -> Row:
    return rows(response)[0]


def _now() -> str:
    return datetime.now(UTC).isoformat()


class RunStore:
    def __init__(self, client: AsyncClient) -> None:
        self._db = client

    @classmethod
    async def connect(cls, url: str, secret_key: str) -> "RunStore":
        return cls(await acreate_client(url, secret_key))

    async def claim(self, run_id: str) -> Row | None:
        """Move a queued run to running. None if it was not queued, which
        makes a duplicate trigger a no-op."""
        claimed = rows(
            await self._db.table("agent_runs")
            .update({"status": "running", "started_at": _now()})
            .eq("id", run_id)
            .eq("status", "queued")
            .execute()
        )
        return claimed[0] if claimed else None

    async def load_agent(self, agent_id: str) -> Row:
        return first(
            await self._db.table("agents")
            .select("name, instructions, tools, model")
            .eq("id", agent_id)
            .execute()
        )

    async def set_activity(self, run_id: str, events: list[dict[str, str]]) -> None:
        await (
            self._db.table("agent_runs")
            .update({"activity": events})
            .eq("id", run_id)
            .execute()
        )

    async def is_cancel_requested(self, run_id: str) -> bool:
        row = first(
            await self._db.table("agent_runs")
            .select("cancel_requested")
            .eq("id", run_id)
            .execute()
        )
        return bool(row["cancel_requested"])

    async def finish(
        self,
        run_id: str,
        *,
        result: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float | None,
    ) -> None:
        await (
            self._db.table("agent_runs")
            .update(
                {
                    "status": "done",
                    "result": result,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost_usd": cost_usd,
                    "finished_at": _now(),
                }
            )
            .eq("id", run_id)
            .execute()
        )

    async def fail(self, run_id: str, error: str) -> None:
        await (
            self._db.table("agent_runs")
            .update({"status": "failed", "error": error, "finished_at": _now()})
            .eq("id", run_id)
            .execute()
        )

    async def cancel(self, run_id: str) -> None:
        await (
            self._db.table("agent_runs")
            .update({"status": "canceled", "finished_at": _now()})
            .eq("id", run_id)
            .execute()
        )

    async def read_file(
        self, user_id: str, file_id: str
    ) -> tuple[str, str, bytes] | None:
        """(name, content_type, data) of one of `user_id`'s files, or None."""
        found = rows(
            await self._db.table("files")
            .select("name, content_type, storage_path")
            .eq("id", file_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not found:
            return None
        row = found[0]
        data = await self._db.storage.from_(BUCKET).download(row["storage_path"])
        return row["name"], row["content_type"], data
