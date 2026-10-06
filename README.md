# a-stack

A template for web applications built on Claude: Next.js and FastAPI on
Vercel, Supabase for data and files, Clerk for auth, Modal for long-running
agents, all provisioned with Terraform.

It ships three demos that exercise every part of the stack — streamed chat
with file uploads, background agents with tools, and schema-constrained
structured output — plus a usage stats page. To start a new project, delete
the demo code rather than assembling the stack.

## Getting started

```bash
git clone <this repo> my-app && cd my-app
lefthook install
```

Then set up credentials as below and follow [DEVELOPMENT.md](DEVELOPMENT.md):
`supabase start`, then `make dev` in `api/`, `agent/`, and `web/`.

## Documentation

- [AGENTS.md](AGENTS.md) — guidance for coding agents; start here
- [ARCHITECTURE.md](ARCHITECTURE.md) — services, request flow, data model
- [DEVELOPMENT.md](DEVELOPMENT.md) — local setup, environment, testing, CI
- [DESIGN.md](DESIGN.md) — the design system
- [STYLE.md](STYLE.md) — code style

## Starting a new project from the template

1. Rename `a-stack` in `terraform/terraform.tfvars`, `supabase/config.toml`
   (`project_id`), `agent/agent/app.py` (app and secret names), `agent/Makefile` (secret
   name), and the package manifests.
2. Delete the demos you don't need: their pages under `web/app/`, components,
   server actions, API routers and services, the `agent/` package, and their
   migrations (squash into a fresh `001`).
3. Update `AGENTS.md` and `ARCHITECTURE.md` to describe your project.

## Setting up services and credentials

Every env file is git-ignored and starts from the `.env.example` beside it.
CI and production build on the local development steps.

### Local development

1. **Create the env files.**
   ```bash
   for f in supabase/.env web/.env web/.env.test web/.env.e2e api/.env agent/.env; do
     cp "$f.example" "$f"
   done
   ```

2. **Clerk development instance.** In the Clerk dashboard, switch to the
   *Development* instance and open **Configure → API keys**.

   | Clerk value | Goes in |
   |---|---|
   | Publishable key (`pk_test_…`) | `web/.env` and `web/.env.e2e`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
   | Secret key (`sk_test_…`) | `web/.env` and `web/.env.e2e`: `CLERK_SECRET_KEY` |
   | Frontend API URL, without `https://` (`your-app-12.clerk.accounts.dev`) | `supabase/.env`: `CLERK_DOMAIN` |
   | The same domain as a JWKS URL | `api/.env`: `CLERK_JWKS_URL=https://<domain>/.well-known/jwks.json` |

   Then, still on the development instance:
   - Enable the Supabase integration at <https://clerk.com/setup/supabase>,
     so session tokens carry `role: authenticated`.
   - Under **Users**, create a test user with an email address and put that
     address in `web/.env.e2e` as `E2E_TEST_EMAIL` (for Playwright, which
     creates its `users` row itself).
   - The Clerk webhook, which creates `users` rows on sign-up, can't reach
     localhost; expose it with ngrok and set `CLERK_WEBHOOK_SIGNING_SECRET`
     in `web/.env` (see [DEVELOPMENT.md](DEVELOPMENT.md#clerk--supabase)).

3. **Local Supabase.** Start it (it reads `CLERK_DOMAIN`), then copy keys
   from `supabase status -o env`:
   ```bash
   cd supabase && supabase start && supabase status -o env
   ```

   | `supabase status` | Goes in |
   |---|---|
   | `PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `web/.env`, `web/.env.test`; `SUPABASE_PUBLISHABLE_KEY` in `api/.env` |
   | `SECRET_KEY` | `SUPABASE_SECRET_KEY` in `web/.env`, `web/.env.test`, `web/.env.e2e`, `agent/.env` |
   | `JWT_SECRET` | `SUPABASE_JWT_SECRET` in `web/.env.test` |
   | `API_URL` (`http://127.0.0.1:54321`) | already filled in; also `SUPABASE_URL` in `agent/.env` (not `REST_URL`, which adds `/rest/v1`) |

   Supabase reads `CLERK_DOMAIN` only at startup: after changing it, run
   `supabase stop && supabase start`.

4. **Anthropic.** Create a key at <https://console.anthropic.com/settings/keys>
   and set `ANTHROPIC_API_KEY` in `api/.env` and `agent/.env`.

5. **Shared secrets.**
   ```bash
   openssl rand -hex 32   # → AGENT_TRIGGER_SECRET in agent/.env and web/.env
   node -e "console.log('whsec_'+require('crypto').randomBytes(32).toString('base64'))"
                          # → CLERK_WEBHOOK_SIGNING_SECRET in web/.env.test
   ```
   Set `AGENT_TRIGGER_URL=http://localhost:8100` in `web/.env`.

### CI

The workflows start local Supabase and run the Playwright suite, so the
GitHub repository needs the Clerk development instance and the test user.
Without them every job fails at `supabase start`. Once steps 2 and 4 are
done, copy the values from the env files:

```bash
val() { grep -E "^$1=" "$2" | cut -d= -f2- | tr -d '\n'; }
gh variable set CLERK_DOMAIN          --body "$(val CLERK_DOMAIN supabase/.env)"
gh variable set CLERK_PUBLISHABLE_KEY --body "$(val NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY web/.env)"
val CLERK_SECRET_KEY  web/.env     | gh secret set CLERK_SECRET_KEY
val E2E_TEST_EMAIL    web/.env.e2e | gh secret set E2E_TEST_EMAIL
val ANTHROPIC_API_KEY api/.env     | gh secret set ANTHROPIC_API_KEY
gh variable list && gh secret list
```

Workflows run only when their package, `supabase/`, or the workflow itself
changes, so a docs-only push triggers no CI.

### Production

Production is deployed from `main` by Vercel and provisioned by Terraform.
Non-secret inputs go in `terraform/terraform.tfvars` (committed, so only
public identifiers); secrets go in `terraform/secrets.auto.tfvars`
(git-ignored; copy the `.example`). Terraform pushes them on to Vercel and
Supabase, so production values are never set in the app env files. Finish
local development setup first.

1. **Accounts and access.**
   - **Domain on Cloudflare.** The app lives at the apex of a Cloudflare
     zone or at a subdomain of it (e.g. `app.example.com`). Cloudflare
     manages whole domains, so the parent domain's nameservers must point to
     Cloudflare.
   - **GitHub and Vercel.** Push the repository to GitHub. In Vercel, connect
     GitHub under **Account Settings → Authentication** (without this login
     connection Vercel cannot link the repository), and give the Vercel
     GitHub app access to the repository
     (<https://github.com/settings/installations>).
   - **Clerk production instance** whose domain is the app's domain. Its
     Frontend API is then `clerk.<domain>`, which Terraform assumes.
   - A Supabase organization, a Modal workspace, and an Anthropic API key.

2. **Clerk production instance.**

   | Clerk value | Goes in |
   |---|---|
   | Publishable key (`pk_live_…`) | `terraform.tfvars`: `clerk_publishable_key` |
   | Secret key (`sk_live_…`) | `secrets.auto.tfvars`: `clerk_secret_key` |
   | **Domains**: the id in `dkim1.<id>.clerk.services` | `terraform.tfvars`: `clerk_dkim_id` |

   Enable the Supabase integration (<https://clerk.com/setup/supabase>) on
   the production instance too.

3. **Other inputs.**

   | Value | Where to get it | Goes in |
   |---|---|---|
   | `domain` | e.g. `app.example.com` | `terraform.tfvars` |
   | `github_repo` | `owner/name` | `terraform.tfvars` |
   | `cloudflare_zone_id` | Cloudflare → the (parent) domain → Overview | `terraform.tfvars` |
   | `supabase_organization_id` | Supabase → Organization settings → slug | `terraform.tfvars` |
   | `vercel_api_token` | Vercel → Account Settings → Tokens, scoped to the team that will own the project | `secrets.auto.tfvars` |
   | `supabase_access_token` | Supabase → Account → Access tokens (`sbp_…`) | `secrets.auto.tfvars` |
   | `cloudflare_api_token` | Cloudflare → My profile → API tokens: **Zone → Zone → Read** and **Zone → DNS → Edit** on the zone | `secrets.auto.tfvars` |
   | `anthropic_api_key` | Anthropic console (a separate production key is easier to track and revoke) | `secrets.auto.tfvars` |
   | `supabase_database_password` | `openssl rand -base64 32 \| tr -d '/+='` | `secrets.auto.tfvars` |
   | `agent_trigger_secret` | `openssl rand -hex 32` | `secrets.auto.tfvars` |

4. **Agent service.** Deploy once to learn the trigger URL. The Modal secret
   must exist to deploy, so this uploads an empty `agent/.env.production` as a
   placeholder; step 7 fills it in.
   ```bash
   cd agent
   uv run modal setup                # once per machine
   cp .env.production.example .env.production
   make secrets && make deploy
   ```
   Put the URL printed under `Created function trigger`
   (`https://<workspace>--a-stack-agent-trigger.modal.run`) in
   `terraform.tfvars` as `agent_trigger_url`. The `View Deployment` link is
   the Modal dashboard, not the endpoint. `make serve` runs the app on Modal
   with live reload against this same secret, so its runs act on production
   data.

5. **Infrastructure.** Leave `clerk_webhook_signing_secret` empty for now.
   ```bash
   cd terraform
   terraform init && terraform apply
   ```
   The first apply creates Clerk's DNS records, then fails on
   `supabase_third_party_auth.clerk` ("Fetching of the JWT signing keys
   (JWKS) … failed"): Supabase cannot reach `clerk.<domain>` until Clerk has
   verified the records and issued certificates. Wait until Clerk →
   **Domains** shows everything verified, then apply again. If it still
   fails, resolvers may have cached the name as missing; wait up to 30
   minutes and retry.

6. **Clerk webhook.** In the production instance, add the endpoint
   `https://<domain>/api/webhooks/clerk` for `user.created` and
   `user.deleted`. Put its signing secret in `secrets.auto.tfvars` as
   `clerk_webhook_signing_secret` and `terraform apply` again.

7. **Agent secret and database.** From `terraform/`:
   ```bash
   terraform output -json agent_env | jq -r 'to_entries[] | "\(.key)=\(.value)"' > ../agent/.env.production
   (cd ../agent && make secrets && make deploy)
   ```
   `agent/.env.production` is git-ignored and keeps production values apart
   from your local `agent/.env`; redeploying starts containers with the new
   secret. Then delete the empty `PROD_*` placeholders in `supabase/.env`
   and apply the migrations:
   ```bash
   terraform output -json supabase_env | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> ../supabase/.env
   cd ../supabase && make push-production
   ```

8. **Deploy.** `git push` to `main`. Vercel gives environment variables only
   to new deployments: after any apply that changes them, push or redeploy
   from the Vercel dashboard.

9. **Verify.** Sign up on the live site (the webhook creates your `users`
   row), then send a chat message, run a structured-output request, and run
   an agent. Accounts created before the webhook existed have no row; add
   one in the Supabase SQL editor:
   `insert into users (clerk_user_id) values ('user_...')`.

#### Changing production values later

- **Vercel values** (Clerk keys, webhook secret, `agent_trigger_url`):
  `terraform apply`, then redeploy.
- **`anthropic_api_key` or `agent_trigger_secret`**: `terraform apply`, rerun
  step 7's agent commands, then redeploy Vercel. Vercel and Modal must hold
  the same trigger secret.

#### Troubleshooting

| Symptom | Cause |
|---|---|
| Agent runs fail with 401 | The Modal secret's `AGENT_TRIGGER_SECRET` differs from Vercel's; rerun step 7's agent commands. |
| `Failed to link <repo>. You need to add a Login Connection` | Vercel has no GitHub login connection (step 1). |
| `Fetching of the JWT signing keys (JWKS)` on apply | Clerk's domain isn't verified yet (step 5). |
| `auth.third_party.clerk has invalid domain` from the Supabase CLI | `CLERK_DOMAIN` in `supabase/.env` is malformed; it must be a bare host. In CI, the `CLERK_DOMAIN` repository variable is missing (see [CI](#ci)). |

See [terraform/README.md](terraform/README.md) for details.
