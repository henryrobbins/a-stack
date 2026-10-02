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
   (`project_id`), `agent/agent/app.py` (app and secret names), and the
   package manifests.
2. Delete the demos you don't need: their pages under `web/app/`, components,
   server actions, API routers and services, the `agent/` package, and their
   migrations (squash into a fresh `001`).
3. Update `AGENTS.md` and `ARCHITECTURE.md` to describe your project.

## Setting up services and credentials

Every env file is git-ignored and starts from the `.env.example` beside it.
Local development needs only steps 1–5; CI and production build on them.

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
     address in `web/.env.e2e` as `E2E_TEST_EMAIL` (for Playwright).
   - The Clerk webhook can't reach localhost; relay it with the Clerk CLI
     and set `CLERK_WEBHOOK_SIGNING_SECRET` in `web/.env` (see
     [DEVELOPMENT.md](DEVELOPMENT.md#clerk--supabase)).

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
   | `API_URL` (`http://127.0.0.1:54321`) | already filled in; also `SUPABASE_URL` in `agent/.env` |

4. **Anthropic.** Create a key at <https://console.anthropic.com/settings/keys>
   and set `ANTHROPIC_API_KEY` in `api/.env` and `agent/.env`.

5. **Shared secrets.**
   ```bash
   openssl rand -hex 32   # → AGENT_TRIGGER_SECRET in agent/.env and web/.env
   node -e "console.log('whsec_'+require('crypto').randomBytes(32).toString('base64'))"
                          # → CLERK_WEBHOOK_SIGNING_SECRET in web/.env.test
   ```
   Set `AGENT_TRIGGER_URL=http://localhost:8100` in `web/.env`.

6. **Modal (optional).** Only needed to run agents on Modal instead of
   in-process: `cd agent && uv run modal setup` to log in, then follow
   [Agents on Modal](DEVELOPMENT.md#agents-on-modal).

### CI

The workflows start local Supabase and run the Playwright suite, so the
GitHub repository needs the Clerk development instance and the test user:

```bash
gh variable set CLERK_DOMAIN          --body your-app-12.clerk.accounts.dev
gh variable set CLERK_PUBLISHABLE_KEY --body pk_test_...
gh secret set CLERK_SECRET_KEY        # sk_test_..., prompted
gh secret set E2E_TEST_EMAIL
gh secret set ANTHROPIC_API_KEY
```

### Production

Production is deployed from `main` by Vercel and provisioned by Terraform.
Non-secret inputs go in `terraform/terraform.tfvars` (committed); secrets go
in `terraform/secrets.auto.tfvars` (git-ignored; copy the `.example`, which
lists the scopes each token needs). Terraform pushes them on to Vercel and
Supabase, so production values are never set in the app env files.

1. **Prerequisites.** A domain whose DNS is on Cloudflare (the app can live
   at its apex or a subdomain, e.g. `app.example.com`; Cloudflare manages
   whole domains, so the parent's nameservers must point to it); the GitHub repository with the
   Vercel GitHub app installed; a Supabase organization; a Clerk production
   instance for the domain; a Modal workspace; an Anthropic API key.

2. **Clerk production instance.**

   | Clerk value | Goes in |
   |---|---|
   | Publishable key (`pk_live_…`) | `terraform.tfvars`: `clerk_publishable_key` |
   | Secret key (`sk_live_…`) | `secrets.auto.tfvars`: `clerk_secret_key` |
   | **Domains**: the id in `dkim1.<id>.clerk.services` | `terraform.tfvars`: `clerk_dkim_id` |

   Enable the Supabase integration on the production instance too. Terraform
   derives the issuer (`https://clerk.<domain>`) and JWKS URL from `domain`.

3. **Other service tokens** (`secrets.auto.tfvars`): `vercel_api_token`,
   `supabase_access_token`, `cloudflare_api_token`, a new
   `supabase_database_password`, `anthropic_api_key`, and a fresh
   `agent_trigger_secret` (`openssl rand -hex 32`). In `terraform.tfvars`,
   set `domain`, `github_repo`, `cloudflare_zone_id` (of the parent domain
   when `domain` is a subdomain), and `supabase_organization_id`.

4. **Agent service.** Deploy once to learn the trigger URL:
   ```bash
   cd agent
   uv run modal setup                # once per machine
   make secrets && make deploy       # note the `trigger` URL
   ```
   Put the URL in `terraform.tfvars` as `agent_trigger_url`. The Modal secret
   is completed in step 6.

5. **Infrastructure.** Leave `clerk_webhook_signing_secret` empty for now.
   Vercel must have a GitHub login connection (Account Settings →
   Authentication) to link the repository.
   ```bash
   cd terraform
   terraform init && terraform apply
   ```
   The first apply creates Clerk's DNS records, but Supabase's Clerk
   integration fails until Clerk has issued certificates for them. Once
   Clerk → **Domains** shows everything verified, apply again.

6. **Agent secret and database.**
   ```bash
   terraform output -json agent_env | jq -r 'to_entries[] | "\(.key)=\(.value)"' > ../agent/.env
   terraform output -json supabase_env | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> ../supabase/.env
   (cd ../agent && make secrets)
   (cd ../supabase && make push-production)
   ```
   This replaces your local `agent/.env`; restore the local values afterwards.

7. **Clerk webhook.** In the production instance, add the endpoint
   `https://<domain>/api/webhooks/clerk` for `user.created` and
   `user.deleted`, put its signing secret in `secrets.auto.tfvars` as
   `clerk_webhook_signing_secret`, and `terraform apply` again. Verify the
   Clerk DNS records under **Domains**.

8. **Deploy.** `git push` to `main`.

See [terraform/README.md](terraform/README.md) for details.
