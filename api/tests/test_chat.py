import json
import uuid
from typing import Any

from httpx import AsyncClient
from supabase import AsyncClient as SupabaseClient

from app.clients.anthropic import get_anthropic_client
from app.db import Row, first, rows
from app.main import app
from tests.conftest import AppUser, MakeUser, act_as
from tests.fakes import FakeAnthropic

PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
)


def use_anthropic(fake: FakeAnthropic) -> FakeAnthropic:
    app.dependency_overrides[get_anthropic_client] = lambda: fake
    return fake


def frames(body: str) -> list[tuple[str, dict[str, Any]]]:
    out = []
    for block in body.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        out.append((lines["event"], json.loads(lines["data"])))
    return out


async def make_chat(admin: SupabaseClient, user: AppUser) -> str:
    row = first(
        await admin.table("chats")
        .insert({"user_id": user.id, "title": "t", "model": "claude-haiku-4-5"})
        .execute()
    )
    return str(row["id"])


async def make_file(
    admin: SupabaseClient, user: AppUser, name: str, content_type: str, data: bytes
) -> str:
    path = f"{user.sub}/{uuid.uuid4()}-{name}"
    await admin.storage.from_("uploads").upload(
        path, data, {"content-type": content_type}
    )
    row = first(
        await admin.table("files")
        .insert(
            {
                "user_id": user.id,
                "name": name,
                "content_type": content_type,
                "size_bytes": len(data),
                "storage_path": path,
            }
        )
        .execute()
    )
    return str(row["id"])


async def messages(admin: SupabaseClient, chat_id: str) -> list[Row]:
    return rows(
        await admin.table("chat_messages")
        .select("role, content, file_ids, input_tokens, output_tokens")
        .eq("chat_id", chat_id)
        .order("created_at")
        .execute()
    )


async def test_streams_reply_and_saves_both_messages(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    user = await make_user()
    chat_id = await make_chat(admin, user)
    act_as(user)
    fake = use_anthropic(FakeAnthropic(chunks=["Hello", ", world"]))

    res = await client.post(f"/api/py/chats/{chat_id}/messages", json={"content": "Hi"})

    assert res.status_code == 200
    events = frames(res.text)
    assert events[:2] == [("delta", {"text": "Hello"}), ("delta", {"text": ", world"})]
    assert events[2][0] == "done"
    assert events[2][1]["input_tokens"] == 12
    assert fake.calls[0]["model"] == "claude-haiku-4-5"
    assert fake.calls[0]["messages"] == [
        {"role": "user", "content": [{"type": "text", "text": "Hi"}]}
    ]
    saved = await messages(admin, chat_id)
    assert [(m["role"], m["content"]) for m in saved] == [
        ("user", "Hi"),
        ("assistant", "Hello, world"),
    ]
    assert (saved[1]["input_tokens"], saved[1]["output_tokens"]) == (12, 34)


async def test_history_is_sent_with_the_new_message(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    user = await make_user()
    chat_id = await make_chat(admin, user)
    act_as(user)
    use_anthropic(FakeAnthropic(chunks=["One"]))
    await client.post(f"/api/py/chats/{chat_id}/messages", json={"content": "First"})
    fake = use_anthropic(FakeAnthropic(chunks=["Two"]))

    await client.post(f"/api/py/chats/{chat_id}/messages", json={"content": "Second"})

    sent = fake.calls[0]["messages"]
    assert [m["role"] for m in sent] == ["user", "assistant", "user"]
    assert sent[1]["content"] == [{"type": "text", "text": "One"}]


async def test_attached_files_become_content_blocks(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    user = await make_user()
    chat_id = await make_chat(admin, user)
    pdf = await make_file(admin, user, "a.pdf", "application/pdf", b"%PDF-1.4 x")
    png = await make_file(admin, user, "b.png", "image/png", PNG)
    txt = await make_file(admin, user, "c.csv", "text/csv", b"a,b\n1,2\n")
    act_as(user)
    fake = use_anthropic(FakeAnthropic(chunks=["ok"]))

    res = await client.post(
        f"/api/py/chats/{chat_id}/messages",
        json={"content": "Read these", "file_ids": [pdf, png, txt]},
    )

    assert res.status_code == 200
    blocks = fake.calls[0]["messages"][0]["content"]
    assert [b["type"] for b in blocks] == ["document", "image", "text", "text"]
    assert blocks[0]["source"]["media_type"] == "application/pdf"
    assert blocks[1]["source"]["media_type"] == "image/png"
    assert "a,b\n1,2" in blocks[2]["text"] and "c.csv" in blocks[2]["text"]
    assert blocks[3] == {"type": "text", "text": "Read these"}
    saved = await messages(admin, chat_id)
    assert saved[0]["file_ids"] == [pdf, png, txt]


async def test_other_users_chat_is_not_found(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    owner, intruder = await make_user(), await make_user()
    chat_id = await make_chat(admin, owner)
    act_as(intruder)
    fake = use_anthropic(FakeAnthropic(chunks=["x"]))

    res = await client.post(f"/api/py/chats/{chat_id}/messages", json={"content": "Hi"})

    assert res.status_code == 404
    assert fake.calls == []
    assert await messages(admin, chat_id) == []


async def test_other_users_file_is_rejected(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    owner, intruder = await make_user(), await make_user()
    file_id = await make_file(admin, owner, "a.txt", "text/plain", b"secret")
    chat_id = await make_chat(admin, intruder)
    act_as(intruder)
    fake = use_anthropic(FakeAnthropic(chunks=["x"]))

    res = await client.post(
        f"/api/py/chats/{chat_id}/messages",
        json={"content": "Hi", "file_ids": [file_id]},
    )

    assert res.status_code == 400
    assert fake.calls == []
    assert await messages(admin, chat_id) == []


async def test_stream_error_saves_no_assistant_message(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    user = await make_user()
    chat_id = await make_chat(admin, user)
    act_as(user)
    use_anthropic(FakeAnthropic(chunks=["partial", "never"], fail_after=1))

    res = await client.post(f"/api/py/chats/{chat_id}/messages", json={"content": "Hi"})

    events = frames(res.text)
    assert events[0] == ("delta", {"text": "partial"})
    assert events[-1][0] == "error"
    assert "upstream connection reset" in events[-1][1]["message"]
    saved = await messages(admin, chat_id)
    assert [m["role"] for m in saved] == ["user"]


async def test_empty_message_is_rejected(
    client: AsyncClient, admin: SupabaseClient, make_user: MakeUser
) -> None:
    user = await make_user()
    chat_id = await make_chat(admin, user)
    act_as(user)
    use_anthropic(FakeAnthropic(chunks=["x"]))

    res = await client.post(f"/api/py/chats/{chat_id}/messages", json={"content": " "})

    assert res.status_code == 422
