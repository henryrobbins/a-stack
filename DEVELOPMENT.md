# DEVELOPMENT.md

## Local development without production secrets

Everything runs locally against a local Supabase stack. You need only:

- a **Clerk development instance** (publishable and secret keys, and its
  domain),
- an **Anthropic API key**,
- a **Modal account**, only to run agents on Modal rather than in-process.

No Terraform state, deployment credentials, or production keys are needed.
The [README](/README.md#setting-up-services-and-credentials) says where each
value goes.

## Prerequisites

- [bun](https://bun.sh) and Node ≥ 22
- [uv](https://docs.astral.sh/uv/) (Python 3.12 is installed automatically)
- [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker
- [lefthook](https://lefthook.dev) for pre-commit hooks: `lefthook install`
- Terraform ≥ 1.9 (maintainers only)

## Quick start

```bash
# 1. Database (API :54321, Studio :54323)
cd supabase
cp .env.example .env            # set CLERK_DOMAIN
supabase start                  # applies migrations and seed.sql

# 2. API (:8000)
cd ../api
cp .env.example .env            # CLERK_JWKS_URL, Supabase values, ANTHROPIC_API_KEY
make install && make dev

# 3. Agent trigger (:8100), runs agents in-process
cd ../agent
cp .env.example .env            # Supabase URL + secret key, ANTHROPIC_API_KEY, AGENT_TRIGGER_SECRET
make install && make dev

# 4. Web (:3000)
cd ../web
cp .env.example .env            # Clerk keys, Supabase values,
                                # AGENT_TRIGGER_URL=http://localhost:8100 + the same secret
make install && make dev
```

`supabase status -o env` prints the local URL, publishable key, secret key,
and JWT secret.

### Clerk ↔ Supabase

Clerk session tokens are Supabase access tokens: RLS reads the Clerk user id
from `auth.jwt()->>'sub'`. Local Supabase trusts the development instance
named by `CLERK_DOMAIN` in `supabase/.env` (`[auth.third_party.clerk]` in
`config.toml`); in Clerk, enable the Supabase integration
(<https://clerk.com/setup/supabase>) so tokens carry `role: authenticated`.

Users rows are created by the Clerk webhook, which cannot reach localhost
directly. Expose it with [ngrok](https://ngrok.com), using the free static
domain from the ngrok dashboard so the URL survives restarts:

```bash
ngrok http --url=<your-domain>.ngrok-free.app 3000
```

In the development instance, add
`https://<your-domain>.ngrok-free.app/api/webhooks/clerk` as a webhook
endpoint for `user.created` and `user.deleted`, and put its signing secret in
`web/.env` as `CLERK_WEBHOOK_SIGNING_SECRET`. Events arrive only while ngrok
runs; Clerk retries missed ones. Without the relay, insert your row in Studio:
`insert into users (clerk_user_id) values ('user_...')`.

### Agents on Modal

`make dev` in `agent/` is enough for local work. To exercise the Modal
deployment itself, point `agent/.env` at a Supabase project Modal can reach,
run `make secrets` (creates the `a-stack-agent` Modal secret from `.env`),
then `make serve` and copy the printed `trigger` URL into
`web/.env` as `AGENT_TRIGGER_URL`.

## Environment files

| File | Used by | Template |
|---|---|---|
| `supabase/.env` | Supabase CLI, `make push-production` | `supabase/.env.example` |
| `web/.env` | `next dev` | `web/.env.example` |
| `web/.env.test` | Vitest | `web/.env.test.example` |
| `web/.env.e2e` | Playwright | `web/.env.e2e.example` |
| `api/.env` | FastAPI | `api/.env.example` |
| `agent/.env` | local trigger, Modal secret | `agent/.env.example` |

Infrastructure secrets live only in `terraform/secrets.auto.tfvars`; see
[terraform/README.md](/terraform/README.md).

## Testing

Tests exercise public interfaces against the real local Supabase, with fakes
only at external boundaries (Clerk, Anthropic). Start Supabase first; the
pytest suites read its URL and keys from `supabase status` unless
`SUPABASE_SECRET_KEY` is already set.

| Package | Command | What runs |
|---|---|---|
| `web/` | `make test` | Vitest: server actions, webhook, uploads, stats under real RLS. Clerk's `auth()` is mocked to return tokens signed with the local JWT secret. |
| `web/` | `make e2e` | Playwright with `@clerk/testing`: signed-out redirect, sign-in, create an agent, a structured-output run. Starts web and api; needs `.env.e2e`, a Clerk test user, and `ANTHROPIC_API_KEY` in `api/.env`. |
| `api/` | `make test` | pytest: chat (including file blocks and stream errors), structured output, RLS isolation, auth failures. A fake Anthropic client is injected through `get_anthropic_client`. |
| `agent/` | `make test` | pytest: tools, the trigger endpoint, and run bookkeeping. The Agent SDK loop itself is not unit-tested. |

## Database changes

```bash
cd supabase
# add migrations/NNN_name.sql, then:
supabase db reset        # re-apply everything from scratch
make types               # regenerate web/types/database.ts
make push-production     # maintainers: apply to production
```

## Makefile conventions

Each package has `install`, `dev`, `lint`, `format`, `typecheck`, and `test`;
`agent/` adds `serve`, `deploy`, and `secrets`; `web/` adds `build` and
`e2e`.

## CI

`.github/workflows/ci-{web,api,agent}.yml` run lint, format, type checks, and
tests (with `supabase start`) on pushes to `main` and on pull requests,
filtered to the package, `supabase/**`, and the workflow file. Configure the
repository:

- **Variables:** `CLERK_DOMAIN`, `CLERK_PUBLISHABLE_KEY` (Clerk development
  instance). `supabase start` fetches the Clerk domain's OIDC configuration,
  so every job that starts Supabase needs it.
- **Secrets:** `CLERK_SECRET_KEY`, `E2E_TEST_EMAIL`, `ANTHROPIC_API_KEY`
  (end-to-end tests only).
