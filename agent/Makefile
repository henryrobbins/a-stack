.PHONY: install dev serve deploy secrets lint format typecheck test

install:
	uv sync

PORT ?= 8100

# Local trigger endpoint that runs agents in-process against local Supabase.
# Set AGENT_TRIGGER_URL=http://localhost:$(PORT) in web/.env.
dev:
	uv run uvicorn agent.local:app --reload --port $(PORT)

# Runs the Modal app with live reload and prints a temporary trigger URL.
# It reads the production secret, so runs act on production data.
serve:
	uv run modal serve agent/app.py

deploy:
	uv run modal deploy agent/app.py

# Creates or replaces the Modal secret from .env.production. Modal runs only production
secrets:
	uv run modal secret create a-stack-agent --from-dotenv .env.production --force

lint:
	uv run ruff check agent/ tests/

format:
	uv run ruff format agent/ tests/

typecheck:
	uv run mypy agent/ tests/

test:
	uv run pytest tests/ -v
