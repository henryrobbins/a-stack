from collections.abc import Awaitable, Callable

from supabase import AsyncClient

from agent.db import RunStore, first
from tests.conftest import Owner, queue_run

MakeOwner = Callable[[], Awaitable[Owner]]


async def status_of(admin: AsyncClient, run_id: str) -> dict[str, object]:
    return first(await admin.table("agent_runs").select("*").eq("id", run_id).execute())


async def test_claim_moves_a_queued_run_to_running(
    admin: AsyncClient, store: RunStore, make_owner: MakeOwner
) -> None:
    run_id = await queue_run(admin, await make_owner())

    run = await store.claim(run_id)

    assert run is not None and run["id"] == run_id
    row = await status_of(admin, run_id)
    assert row["status"] == "running"
    assert row["started_at"] is not None


async def test_second_claim_is_a_no_op(
    admin: AsyncClient, store: RunStore, make_owner: MakeOwner
) -> None:
    run_id = await queue_run(admin, await make_owner())
    await store.claim(run_id)

    assert await store.claim(run_id) is None


async def test_claim_carries_an_early_cancel_request(
    admin: AsyncClient, store: RunStore, make_owner: MakeOwner
) -> None:
    run_id = await queue_run(admin, await make_owner(), cancel_requested=True)

    run = await store.claim(run_id)

    assert run is not None and run["cancel_requested"] is True


async def test_load_agent(
    admin: AsyncClient, store: RunStore, make_owner: MakeOwner
) -> None:
    run_id = await queue_run(admin, await make_owner(), tools=["calculator"])
    run = await store.claim(run_id)
    assert run is not None

    agent = await store.load_agent(run["agent_id"])

    assert agent["tools"] == ["calculator"]
    assert agent["model"] == "claude-haiku-4-5"


async def test_activity_and_cancel_flag(
    admin: AsyncClient, store: RunStore, make_owner: MakeOwner
) -> None:
    run_id = await queue_run(admin, await make_owner())
    events = [{"kind": "text", "text": "Thinking"}]

    await store.set_activity(run_id, events)
    assert await store.is_cancel_requested(run_id) is False
    await (
        admin.table("agent_runs")
        .update({"cancel_requested": True})
        .eq("id", run_id)
        .execute()
    )

    assert (await status_of(admin, run_id))["activity"] == events
    assert await store.is_cancel_requested(run_id) is True


async def test_finish_records_result_and_usage(
    admin: AsyncClient, store: RunStore, make_owner: MakeOwner
) -> None:
    run_id = await queue_run(admin, await make_owner())

    await store.finish(
        run_id, result="42", input_tokens=10, output_tokens=5, cost_usd=0.0012
    )

    row = await status_of(admin, run_id)
    assert row["status"] == "done"
    assert row["result"] == "42"
    assert (row["input_tokens"], row["output_tokens"]) == (10, 5)
    assert float(str(row["cost_usd"])) == 0.0012
    assert row["finished_at"] is not None


async def test_fail_and_cancel_are_terminal(
    admin: AsyncClient, store: RunStore, make_owner: MakeOwner
) -> None:
    owner = await make_owner()
    failed, canceled = await queue_run(admin, owner), await queue_run(admin, owner)

    await store.fail(failed, "boom")
    await store.cancel(canceled)

    failed_row = await status_of(admin, failed)
    assert (failed_row["status"], failed_row["error"]) == ("failed", "boom")
    canceled_row = await status_of(admin, canceled)
    assert canceled_row["status"] == "canceled"
    assert canceled_row["finished_at"] is not None


async def test_read_file_is_scoped_to_the_owner(
    admin: AsyncClient, store: RunStore, make_owner: MakeOwner
) -> None:
    alice, bob = await make_owner(), await make_owner()
    path = f"{alice.sub}/note.txt"
    await admin.storage.from_("uploads").upload(
        path, b"hello", {"content-type": "text/plain"}
    )
    file_id = first(
        await admin.table("files")
        .insert(
            {
                "user_id": alice.id,
                "name": "note.txt",
                "content_type": "text/plain",
                "size_bytes": 5,
                "storage_path": path,
            }
        )
        .execute()
    )["id"]

    assert await store.read_file(alice.id, file_id) == (
        "note.txt",
        "text/plain",
        b"hello",
    )
    assert await store.read_file(bob.id, file_id) is None
