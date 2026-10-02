"""Turn uploaded files into Claude content blocks."""

import base64
from typing import Any

from supabase import AsyncClient

from app.db import rows

BUCKET = "uploads"
TEXT_TYPES = {"text/plain", "text/csv", "text/markdown", "application/json"}
IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}


class UnknownFileError(Exception):
    """A requested file does not exist or is not visible to the caller."""


def content_block(name: str, content_type: str, data: bytes) -> dict[str, Any]:
    """PDFs become `document` blocks, images `image` blocks, text inline text."""
    if content_type == "application/pdf":
        return {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": content_type,
                "data": base64.b64encode(data).decode(),
            },
            "title": name,
        }
    if content_type in IMAGE_TYPES:
        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": content_type,
                "data": base64.b64encode(data).decode(),
            },
        }
    if content_type in TEXT_TYPES:
        text = data.decode("utf-8", errors="replace")
        return {"type": "text", "text": f'<file name="{name}">\n{text}\n</file>'}
    raise ValueError(f"Unsupported content type: {content_type}")


async def load_blocks(
    supabase: AsyncClient, file_ids: list[str]
) -> dict[str, dict[str, Any]]:
    """Content blocks keyed by file id, read as the caller (RLS applies).

    Raises UnknownFileError if any id is not visible to the caller.
    """
    if not file_ids:
        return {}
    found = rows(
        await supabase.table("files")
        .select("id, name, content_type, storage_path")
        .in_("id", file_ids)
        .execute()
    )
    by_id = {row["id"]: row for row in found}
    missing = set(file_ids) - by_id.keys()
    if missing:
        raise UnknownFileError(", ".join(sorted(missing)))
    blocks = {}
    for file_id, row in by_id.items():
        data = await supabase.storage.from_(BUCKET).download(row["storage_path"])
        blocks[file_id] = content_block(row["name"], row["content_type"], data)
    return blocks
