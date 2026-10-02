"""Typed access to PostgREST results, which supabase-py types as generic JSON."""

from typing import Any, cast

from postgrest import APIResponse

Row = dict[str, Any]


def rows(response: APIResponse) -> list[Row]:
    return cast(list[Row], response.data)


def first(response: APIResponse) -> Row:
    """The first row of a response that must have one (e.g. an insert)."""
    return rows(response)[0]
