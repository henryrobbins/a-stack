# ARCHITECTURE.md

| Concern | Choice |
|---|---|
| Web | Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind 4, shadcn/ui, bun |
| Auth | Clerk 7 (Core 3); Supabase trusts Clerk session tokens (third-party auth) |
| Database & files | Supabase Postgres (RLS everywhere) and Supabase Storage |
| API | FastAPI on Vercel, served by Vercel Services under `/api/py` |
| Agents | Modal app running the Claude Agent SDK |
| LLM | Anthropic Python SDK + Claude Agent SDK |
| Infrastructure | Terraform: Vercel, Supabase (local state) |

Production only — there is no staging environment.

## Request flow

```
browser ──/api/py/*──▶ FastAPI (api/) ──user token──▶ Supabase (RLS)
   │                                   └──────────▶ Anthropic
   ├──server actions──▶ Next.js (web/) ──user token──▶ Supabase (RLS)
   │                         └──POST {run_id} + X-Trigger-Secret──▶ Modal trigger
   └──uploads──────────────────────────user token──▶ Supabase Storage
Modal worker ──secret key──▶ Supabase ; ──▶ Anthropic (Agent SDK)
Clerk ──webhook──▶ web/app/api/webhooks/clerk ──secret key──▶ users
```

- **Same origin.** `vercel.json` routes `/api/py/*` to the `api` service and
  everything else to `web`. Vercel preserves the request path, so FastAPI
  mounts every route under `APIRouter(prefix="/api/py")`. There is no CORS
  configuration, and each preview deployment pairs a web build with its own
  API build. In development, `web/next.config.ts` rewrites `/api/py/*` to
  `localhost:8000`.
- **Pass-through auth.** The browser sends its Clerk session token as a
  bearer token. FastAPI verifies it against Clerk's JWKS (`api/app/auth.py`)
  and forwards the same token to Supabase (`api/app/deps.py`), so every API
  read and write is subject to RLS.
- **Secret-key users.** Only two pieces of code use the Supabase secret key:
  the Clerk webhook route in `web/` and the Modal worker, which acts on behalf
  of a run rather than a live session. The API never reads it.
- **Uploads** go from the browser directly to Storage (avoiding Vercel's
  4.5 MB request body limit) at `{clerk_sub}/{uuid}-{filename}`; storage
  policies scope access by that first path segment.

## Demos

### Chat

`createChat` (server action) inserts a chat titled from the first message.
`POST /api/py/chats/{id}/messages` loads the history and attached files as
the caller, turns files into Claude content blocks (PDF → `document`, images →
`image`, text → inline text), saves the user message, and streams the reply
as SSE frames: `delta`, then `done` with usage, or `error`. The assistant
message is saved only when the stream completes. `web/lib/api.ts` holds the
one shared SSE parser.

### Agents

An agent is a saved configuration: instructions, model, and a subset of
three tools (`calculator`, `current_time`, `read_file`). `startRun` inserts a
queued `agent_runs` row and POSTs its id to the Modal trigger; if the trigger
fails, the run is marked failed through `fail_queued_run()`.

On Modal, `trigger` (`agent/agent/server.py`) checks the shared secret and
spawns `run_agent`, which claims the run with a conditional update (`queued` →
`running`, so a duplicate trigger is a no-op). The worker runs the Agent SDK
with an in-process MCP server exposing only the selected tools, no built-in
tools, a turn limit, and a timeout. Every few seconds it writes a compact
`activity` feed and checks `cancel_requested`; it finishes with the result,
token usage, and cost. `/runs/[id]` polls the row every 2 s while the run is
active. With no shell or file-system tools, the Modal container is sufficient
isolation.

For local development `agent/agent/local.py` serves the same trigger with
uvicorn and executes runs in-process, because a Modal container cannot reach
a local Supabase stack.

### Structured output

`POST /api/py/structured` calls Claude with `output_config.format` set to the
user's JSON schema, saves a `structured_runs` row, and returns the parsed
output, usage, and duration. A schema the API rejects becomes a 400 whose
message is shown inline and saved as the run's `error`.

### Stats

`session_stats` is a `security_invoker` view unioning chats, agent runs, and
structured runs, so the underlying tables' RLS applies.

## Database

Migrations live in `supabase/migrations/` (`NNN_snake_case.sql`, each opening
with a header comment; every column is commented).

| Table | Purpose |
|---|---|
| `users` | Clerk user id ↔ internal UUID; written only by the webhook |
| `files` | Uploaded objects in the private `uploads` bucket |
| `chats`, `chat_messages` | Chat sessions and turns (with token usage) |
| `agents`, `agent_runs` | Agent configurations and their runs |
| `structured_runs` | Structured-output requests and results |
| `session_stats` (view) | One row per session for the stats page |

- `current_app_user_id()` (`SECURITY DEFINER`, `search_path = ''`) maps
  `auth.jwt()->>'sub'` to `users.id`. Every table has `user_id` defaulting to
  it, `ENABLE` + `FORCE ROW LEVEL SECURITY`, and owner policies of the form
  `(SELECT current_app_user_id()) = user_id`.
- Tables are not exposed to the Data API by default; each migration grants
  exactly what `authenticated` and `service_role` need.
- Owners may insert only `agent_id` and `prompt` into `agent_runs` and update
  only `cancel_requested` (column privileges). The worker writes everything
  else with the secret key.
- Deleting a user (webhook `user.deleted`) cascades to all of their rows.
  Storage objects are not removed.

## Models

The allowlist lives in `web/lib/models.ts` (forms) and `api/app/config.py`
(validation). The default is `claude-sonnet-5-5`; forms also offer
`claude-opus-5-5` and `claude-haiku-4-5`. Chats and agents store their model,
so the agent worker uses `agents.model` and needs no list of its own.

## Infrastructure

Terraform (`terraform/`) provisions the Vercel project (Services framework,
Fluid compute, `iad1`, env vars), the Supabase project in `us-east-1` with its
secret key and Clerk third-party auth. The app is served at the project's
`*.vercel.app` URL, so there is no DNS to manage. Not in Terraform: the Clerk
instance and webhook registration (dashboard), and Modal secrets and deploys
(`agent/Makefile`).

![Keys in production](/docs/keys-production.svg)

**Known limitations:**

- `*.vercel.app` can't host a Clerk production instance, so production runs
  on a Clerk development instance, with its user cap and development-mode
  badge. Moving to a production instance requires a custom domain.
- Preview deployments share production environment values, including the
  production database.
- Vercel Services share one project environment, so the FastAPI process also
  receives `SUPABASE_SECRET_KEY`, `CLERK_SECRET_KEY`, and
  `AGENT_TRIGGER_SECRET`, although its code never reads them. A compromise of
  the API process could therefore bypass RLS. If that matters, host the Clerk
  webhook outside this project.
