import json

import anthropic
import httpx2
from httpx import AsyncClient
from supabase import AsyncClient as SupabaseClient

from app.clients.anthropic import get_anthropic_client
from app.db import Row, rows
from app.main import app
from tests.conftest import AppUser, MakeUser, act_as
from tests.fakes import FakeAnthropic

SCHEMA = {
    "type": "object",
    "properties": {"name": {"type": "string"}},
    "required": ["name"],
    "additionalProperties": False,
}


def use_anthropic(fake: FakeAnthropic) -> FakeAnthropic:
    app.dependency_overrides[get_anthropic_client] = lambda: fake
    return fake


def bad_request(message: str) -> anthropic.BadRequestError:
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    response = httpx2.Response(400, request=request)
    return anthropic.BadRequestError(message, response=response, body=None)


async def runs_of(admin: SupabaseClient, user: AppUser) -> list[Row]:
    return rows(
        await admin.table("structured_runs")
        .select("prompt, schema, output, error, model, input_tokens, output_tokens")
        .eq("user_id", user.id)
        .execute()
    )


async def test_returns_and_saves_validated_output(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    user = await make_user()
    act_as(user)
    fake = use_anthropic(FakeAnthropic(text=json.dumps({"name": "Ada"})))

    res = await client.post(
        "/api/py/structured",
        json={"prompt": "Who?", "schema": SCHEMA, "model": "claude-haiku-4-5"},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["output"] == {"name": "Ada"}
    assert (body["input_tokens"], body["output_tokens"]) == (5, 7)
    assert body["duration_ms"] >= 0
    call = fake.calls[0]
    assert call["model"] == "claude-haiku-4-5"
    assert call["output_config"] == {
        "format": {"type": "json_schema", "schema": SCHEMA}
    }
    [run] = await runs_of(admin, user)
    assert run["output"] == {"name": "Ada"}
    assert run["schema"] == SCHEMA
    assert run["error"] is None


async def test_rejected_schema_returns_400_and_saves_error(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    user = await make_user()
    act_as(user)
    use_anthropic(FakeAnthropic(error=bad_request("Schema is too complex")))

    res = await client.post(
        "/api/py/structured", json={"prompt": "Who?", "schema": SCHEMA}
    )

    assert res.status_code == 400
    assert "Schema is too complex" in res.json()["detail"]
    [run] = await runs_of(admin, user)
    assert run["output"] is None
    assert "Schema is too complex" in run["error"]


async def test_default_model_is_used_when_omitted(
    client: AsyncClient, make_user: MakeUser
) -> None:
    act_as(await make_user())
    fake = use_anthropic(FakeAnthropic(text="{}"))

    await client.post("/api/py/structured", json={"prompt": "x", "schema": SCHEMA})

    assert fake.calls[0]["model"] == "claude-sonnet-5-5"


async def test_unknown_model_is_rejected(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    user = await make_user()
    act_as(user)
    fake = use_anthropic(FakeAnthropic(text="{}"))

    res = await client.post(
        "/api/py/structured",
        json={"prompt": "x", "schema": SCHEMA, "model": "gpt-9"},
    )

    assert res.status_code == 422
    assert fake.calls == []
    assert await runs_of(admin, user) == []
