"""Chat turns: build the conversation, stream Claude's reply, persist both sides."""

import json
from collections.abc import AsyncIterator
from typing import Any

from anthropic import AsyncAnthropic
from supabase import AsyncClient

from app.config import settings
from app.db import Row, first, rows
from app.prompts import render_prompt
from app.services import files


class ChatNotFoundError(Exception):
    """The chat does not exist or is not visible to the caller."""


def sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def prepare_turn(
    supabase: AsyncClient, chat_id: str, content: str, file_ids: list[str]
) -> tuple[str, list[dict[str, Any]]]:
    """Load the chat and build the messages to send, saving the user message.

    Returns the chat's model and the Claude messages. Raises ChatNotFoundError
    or files.UnknownFileError before anything is saved.
    """
    found = rows(
        await supabase.table("chats").select("model").eq("id", chat_id).execute()
    )
    if not found:
        raise ChatNotFoundError(chat_id)
    history = rows(
        await supabase.table("chat_messages")
        .select("role, content, file_ids")
        .eq("chat_id", chat_id)
        .order("created_at")
        .execute()
    )

    turns: list[Row] = [
        *history,
        {"role": "user", "content": content, "file_ids": file_ids},
    ]
    all_ids = list(dict.fromkeys(fid for turn in turns for fid in turn["file_ids"]))
    blocks = await files.load_blocks(supabase, all_ids)
    messages = [
        {
            "role": turn["role"],
            "content": [
                *(blocks[fid] for fid in turn["file_ids"]),
                {"type": "text", "text": turn["content"]},
            ],
        }
        for turn in turns
    ]

    await (
        supabase.table("chat_messages")
        .insert(
            {
                "chat_id": chat_id,
                "role": "user",
                "content": content,
                "file_ids": file_ids,
            }
        )
        .execute()
    )
    return str(found[0]["model"]), messages


async def stream_reply(
    supabase: AsyncClient,
    anthropic: AsyncAnthropic,
    chat_id: str,
    model: str,
    messages: list[dict[str, Any]],
) -> AsyncIterator[str]:
    """SSE frames: `delta` per text chunk, then `done` with usage, or `error`.

    The assistant message is saved only when the reply completes.
    """
    try:
        parts: list[str] = []
        async with anthropic.messages.stream(
            model=model,
            max_tokens=settings.max_tokens,
            system=render_prompt("chat_system"),
            messages=messages,  # type: ignore[arg-type]
        ) as stream:
            async for text in stream.text_stream:
                parts.append(text)
                yield sse("delta", {"text": text})
            final = await stream.get_final_message()
        usage = {
            "input_tokens": final.usage.input_tokens,
            "output_tokens": final.usage.output_tokens,
        }
        saved = first(
            await supabase.table("chat_messages")
            .insert(
                {
                    "chat_id": chat_id,
                    "role": "assistant",
                    "content": "".join(parts),
                    **usage,
                }
            )
            .execute()
        )
        yield sse("done", {"message_id": saved["id"], **usage})
    except Exception as exc:
        yield sse("error", {"message": str(exc)})
