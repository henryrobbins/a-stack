"""Structured output: a single Claude call constrained to a JSON schema."""

import json
import time
from typing import Any

import anthropic
from supabase import AsyncClient

from app.config import settings
from app.db import Row, first
from app.prompts import render_prompt


class SchemaRejectedError(Exception):
    """Claude rejected the request, typically because of the schema."""


async def run(
    supabase: AsyncClient,
    client: anthropic.AsyncAnthropic,
    prompt: str,
    schema: dict[str, Any],
    model: str,
) -> Row:
    """Call Claude and save the run, returning the saved row.

    Raises SchemaRejectedError (after saving the run with its error) when the
    API rejects the request.
    """
    record: dict[str, Any] = {"prompt": prompt, "schema": schema, "model": model}
    started = time.perf_counter()
    try:
        response = await client.messages.create(
            model=model,
            max_tokens=settings.max_tokens,
            system=render_prompt("structured_system"),
            messages=[{"role": "user", "content": prompt}],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )
    except anthropic.BadRequestError as exc:
        record["error"] = exc.message
        await supabase.table("structured_runs").insert(record).execute()
        raise SchemaRejectedError(exc.message) from exc

    text = next(block.text for block in response.content if block.type == "text")
    record |= {
        "output": json.loads(text),
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "duration_ms": round((time.perf_counter() - started) * 1000),
    }
    return first(await supabase.table("structured_runs").insert(record).execute())
