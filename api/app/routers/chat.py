from typing import Annotated
from uuid import UUID

from anthropic import AsyncAnthropic
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, StringConstraints
from supabase import AsyncClient

from app.clients.anthropic import get_anthropic_client
from app.deps import get_supabase
from app.services import chat, files

router = APIRouter()


class MessageIn(BaseModel):
    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    file_ids: list[UUID] = []


@router.post("/chats/{chat_id}/messages")
async def send_message(
    chat_id: UUID,
    body: MessageIn,
    supabase: AsyncClient = Depends(get_supabase),
    anthropic: AsyncAnthropic = Depends(get_anthropic_client),
) -> StreamingResponse:
    """Send a user message and stream the reply as Server-Sent Events."""
    try:
        model, messages = await chat.prepare_turn(
            supabase, str(chat_id), body.content, [str(f) for f in body.file_ids]
        )
    except chat.ChatNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Chat not found") from exc
    except files.UnknownFileError as exc:
        raise HTTPException(status_code=400, detail="Unknown file") from exc
    return StreamingResponse(
        chat.stream_reply(supabase, anthropic, str(chat_id), model, messages),
        media_type="text/event-stream",
    )
