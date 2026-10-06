# AGENTS.md

Read this file in its entirety before completing any task, and update the
documentation to reflect any changes you make to the repository.

## Project Overview

**a-stack** is a template for web applications built on Claude. It ships
three demos that exercise every part of the stack; starting a new project
means deleting demo code, not assembling infrastructure.

- **Chat** (`/chat`) — streamed replies from Claude with PDF, image, and text
  attachments uploaded straight to Supabase Storage.
- **Agents** (`/agents`, `/runs/[id]`) — saved agent configurations run in the
  background on Modal with the Claude Agent SDK and a choice of three tools.
- **Structured output** (`/structured`) — JSON constrained to a user-written
  schema.
- **Stats** (`/stats`) — token usage and duration across all sessions.

## Repository Structure

```
├── web/          # Next.js app (Clerk auth, Supabase, server actions)
├── api/          # FastAPI service under /api/py (chat, structured output)
├── agent/        # Modal app: trigger endpoint + Agent SDK worker
├── supabase/     # config.toml, migrations, seed, Makefile
├── terraform/    # Vercel, Supabase
└── vercel.json   # Vercel Services: web + api in one project
```

## Architecture

See [ARCHITECTURE](/ARCHITECTURE.md). Read this before planning.

## Style Guide

See [STYLE](/STYLE.md). Read this before implementing.

## UI/UX Design

See [DESIGN](/DESIGN.md). Read this before planning or implementing anything
that affects UI/UX.

## Development

See [DEVELOPMENT](/DEVELOPMENT.md) for local development, environment
management, and testing.

## CSS and Theming

Every design token is defined in `web/app/globals.css` under Tailwind 4
`@theme`; shadcn's semantic colors map onto them there. Never hardcode colors
or add tokens anywhere else.

## Available Skills

Vendored in `.agents/skills` (symlinked into `.claude/skills`; provenance in
`skills-lock.json`). Use them when relevant:

| Skill | When to use |
|-------|-------------|
| `claude-api` | Anthropic SDK, Agent SDK, model ids, structured outputs |
| `clerk`, `clerk-nextjs-patterns`, `clerk-webhooks`, `clerk-testing`, … | Auth flows, proxy, webhooks, Playwright sign-in |
| `supabase-postgres-best-practices` | Schema, migrations, RLS, queries |
| `shadcn` | Adding or modifying UI components |
| `vercel-react-best-practices`, `web-design-guidelines` | React/Next.js code and UI review |
| `terraform-style-guide` | Terraform changes |
| `modal` | The agent service |
