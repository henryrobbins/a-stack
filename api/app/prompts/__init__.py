"""Prompt templates (Jinja2, `.j2` files in this package)."""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent),
    undefined=StrictUndefined,
    keep_trailing_newline=True,
    autoescape=False,
)


def render_prompt(name: str, **context: object) -> str:
    """Render `<name>.j2`; a variable missing from `context` raises."""
    return _env.get_template(f"{name}.j2").render(**context)
