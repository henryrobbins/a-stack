"""Execute one agent run with the Claude Agent SDK."""

import asyncio
import time
from typing import Any

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
)

from agent.config import Settings
from agent.db import Row, RunStore
from agent.tools import SERVER_NAME, build_server

Event = dict[str, str]
# The feed is for watching progress, not an audit log; keep it small.
MAX_EVENTS = 50
MAX_EVENT_CHARS = 500


def _event(kind: str, text: str) -> Event:
    text = text.strip()
    if len(text) > MAX_EVENT_CHARS:
        text = text[: MAX_EVENT_CHARS - 1] + "…"
    return {"kind": kind, "text": text}


def _events(message: Any) -> list[Event]:
    """Compact activity events for one SDK message."""
    events: list[Event] = []
    if isinstance(message, AssistantMessage):
        for block in message.content:
            if isinstance(block, TextBlock) and block.text.strip():
                events.append(_event("text", block.text))
            elif isinstance(block, ToolUseBlock):
                name = block.name.removeprefix(f"mcp__{SERVER_NAME}__")
                args = ", ".join(f"{k}={v!r}" for k, v in block.input.items())
                events.append(_event("tool", f"{name}({args})"))
    elif isinstance(message, UserMessage) and isinstance(message.content, list):
        for block in message.content:
            if isinstance(block, ToolResultBlock):
                content = block.content
                if isinstance(content, list):
                    content = " ".join(str(part.get("text", "")) for part in content)
                kind = "error" if block.is_error else "result"
                events.append(_event(kind, str(content or "")))
    return events


async def _run_loop(
    store: RunStore, run: Row, agent: Row, settings: Settings
) -> ResultMessage | None:
    """Drive the agent, streaming activity into the run row. Returns the
    final result, or None if the owner canceled."""
    server, allowed = build_server(store, run["user_id"], agent["tools"])
    options = ClaudeAgentOptions(
        model=agent["model"],
        system_prompt=agent["instructions"],
        # No built-in tools (shell, files, web); only the selected MCP tools,
        # which are pre-approved. Anything else is denied without prompting.
        tools=[],
        mcp_servers={SERVER_NAME: server},
        allowed_tools=allowed,
        permission_mode="dontAsk",
        max_turns=settings.max_turns,
        setting_sources=[],
        env={"ANTHROPIC_API_KEY": settings.anthropic_api_key},
    )
    activity: list[Event] = []
    last_flush = time.monotonic()
    async with ClaudeSDKClient(options) as client:
        await client.query(run["prompt"])
        async for message in client.receive_response():
            activity = (activity + _events(message))[-MAX_EVENTS:]
            if isinstance(message, ResultMessage):
                await store.set_activity(run["id"], activity)
                return message
            if time.monotonic() - last_flush >= settings.activity_interval_s:
                last_flush = time.monotonic()
                await store.set_activity(run["id"], activity)
                if await store.is_cancel_requested(run["id"]):
                    await client.interrupt()
                    return None
    return None


async def execute(store: RunStore, run_id: str, settings: Settings) -> None:
    """Claim and execute a queued run, recording its outcome.

    A run that is not queued (e.g. a duplicate trigger) is left untouched.
    """
    run = await store.claim(run_id)
    if run is None:
        return
    try:
        if run["cancel_requested"]:
            await store.cancel(run_id)
            return
        agent = await store.load_agent(run["agent_id"])
        async with asyncio.timeout(settings.timeout_s):
            result = await _run_loop(store, run, agent, settings)
        if result is None:
            await store.cancel(run_id)
        elif result.is_error:
            await store.fail(run_id, result.result or result.subtype)
        else:
            usage = result.usage or {}
            await store.finish(
                run_id,
                result=result.result or "",
                input_tokens=int(usage.get("input_tokens", 0)),
                output_tokens=int(usage.get("output_tokens", 0)),
                cost_usd=result.total_cost_usd,
            )
    except TimeoutError:
        await store.fail(run_id, f"Timed out after {settings.timeout_s} s")
    except Exception as exc:
        await store.fail(run_id, str(exc) or type(exc).__name__)
