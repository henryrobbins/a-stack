.PHONY: install dev build lint format typecheck test e2e

install:
	bun install

dev:
	bun run dev

build:
	bun run build

lint:
	bun run lint

format:
	bun run format

typecheck:
	bunx tsc --noEmit

test:
	bun run test

e2e:
	bun run test:e2e
