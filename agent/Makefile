.PHONY: install dev serve deploy secrets lint format typecheck test

install:
	uv sync

PORT ?= 8100

# Local trigger endpoint that runs agents in-process against local Supabase.
# Set AGENT_TRIGGER_URL=http://localhost:$(PORT) in web/.env.
dev:
	uv run uvicorn agent.local:app --reload --port $(PORT)

# Runs the Modal app with live reload and prints a temporary trigger URL.
# Its containers need a Supabase URL they can reach (not 127.0.0.1).
serve:
	uv run modal serve agent/app.py

deploy:
	uv run modal deploy agent/app.py

# Creates or replaces the Modal secret from ENV_FILE (default .env); production
# uses `make secrets ENV_FILE=.env.production`.
ENV_FILE ?= .env

secrets:
	uv run modal secret create a-stack-agent --from-dotenv $(ENV_FILE) --force

lint:
	uv run ruff check agent/ tests/

format:
	uv run ruff format agent/ tests/

typecheck:
	uv run mypy agent/ tests/

test:
	uv run pytest tests/ -v
