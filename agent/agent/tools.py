"""The tools an agent can be given, plus the in-process MCP server exposing them."""

import ast
import operator
from collections.abc import Callable
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from claude_agent_sdk import SdkMcpTool, create_sdk_mcp_server, tool
from claude_agent_sdk.types import McpSdkServerConfig

from agent.db import RunStore

SERVER_NAME = "tools"
TEXT_TYPES = {"text/plain", "text/csv", "text/markdown", "application/json"}
MAX_FILE_CHARS = 100_000
MAX_EXPONENT = 10_000

_BINARY: dict[type[ast.operator], Callable[[Any, Any], Any]] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY: dict[type[ast.unaryop], Callable[[Any], Any]] = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def _evaluate(node: ast.AST) -> int | float:
    value = node.value if isinstance(node, ast.Constant) else None
    if isinstance(value, int | float) and not isinstance(value, bool):
        return value
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY:
        return _UNARY[type(node.op)](_evaluate(node.operand))  # type: ignore[no-any-return]
    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY:
        left, right = _evaluate(node.left), _evaluate(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > MAX_EXPONENT:
            raise ValueError("exponent too large")
        return _BINARY[type(node.op)](left, right)  # type: ignore[no-any-return]
    raise ValueError(f"unsupported expression: {ast.dump(node)[:60]}")


def calculator(expression: str) -> str:
    """Evaluate an arithmetic expression (numbers, + - * / // % ** and
    parentheses). Raises ValueError for anything else."""
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise ValueError(f"invalid expression: {exc.msg}") from exc
    try:
        value = _evaluate(tree.body)
    except ZeroDivisionError as exc:
        raise ValueError("division by zero") from exc
    except OverflowError as exc:
        raise ValueError("result too large") from exc
    return str(value)


def current_time(timezone: str) -> str:
    """The current time in an IANA time zone, as ISO 8601."""
    try:
        zone = ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError(f"Unknown time zone: {timezone}") from exc
    return datetime.now(zone).isoformat(timespec="seconds")


def _text(text: str, *, error: bool = False) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": text}], "is_error": error}


def build_server(
    store: RunStore, user_id: str, enabled: list[str]
) -> tuple[McpSdkServerConfig, list[str]]:
    """An MCP server with only the `enabled` tools, and their qualified names
    for `allowed_tools`. `read_file` only sees `user_id`'s files."""

    @tool("calculator", "Evaluate an arithmetic expression.", {"expression": str})
    async def calculator_tool(args: dict[str, Any]) -> dict[str, Any]:
        try:
            return _text(calculator(args["expression"]))
        except ValueError as exc:
            return _text(str(exc), error=True)

    @tool(
        "current_time",
        "Get the current time in an IANA time zone, e.g. Europe/Paris.",
        {"timezone": str},
    )
    async def current_time_tool(args: dict[str, Any]) -> dict[str, Any]:
        try:
            return _text(current_time(args["timezone"]))
        except ValueError as exc:
            return _text(str(exc), error=True)

    @tool("read_file", "Read one of the user's uploaded files by id.", {"file_id": str})
    async def read_file_tool(args: dict[str, Any]) -> dict[str, Any]:
        found = await store.read_file(user_id, args["file_id"])
        if found is None:
            return _text("No such file.", error=True)
        name, content_type, data = found
        if content_type not in TEXT_TYPES:
            return _text(f"{name} is a {content_type} file and cannot be read as text.")
        return _text(data.decode("utf-8", errors="replace")[:MAX_FILE_CHARS])

    available: dict[str, SdkMcpTool[Any]] = {
        "calculator": calculator_tool,
        "current_time": current_time_tool,
        "read_file": read_file_tool,
    }
    selected = [available[name] for name in enabled if name in available]
    server = create_sdk_mcp_server(SERVER_NAME, tools=selected)
    return server, [f"mcp__{SERVER_NAME}__{t.name}" for t in selected]
