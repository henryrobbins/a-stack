.PHONY: install dev lint format typecheck test

PORT ?= 8000

install:
	uv sync

dev:
	uv run uvicorn app.main:app --reload --port $(PORT)

lint:
	uv run ruff check app/ tests/

format:
	uv run ruff format app/ tests/

typecheck:
	uv run mypy app/ tests/

test:
	uv run pytest tests/ -v
