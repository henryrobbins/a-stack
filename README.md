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

Then follow [DEVELOPMENT.md](DEVELOPMENT.md): `supabase start`, then
`make dev` in `api/`, `agent/`, and `web/`. Local development needs only a
Clerk development instance, an Anthropic API key, and (optionally) a Modal
account.

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

## Deploying (maintainers)

Production is deployed from `main` by Vercel; infrastructure is Terraform.

1. **Prerequisites.** A domain on Cloudflare; the GitHub repository with the
   Vercel GitHub app installed; a Supabase organization; a Clerk production
   instance for the domain; a Modal workspace; an Anthropic API key.
2. **Agent service.**
   ```bash
   cd agent
   # agent/.env: production SUPABASE_URL/SUPABASE_SECRET_KEY come from
   # `terraform output -json agent_env` after step 3; on the first run,
   # deploy once to learn the trigger URL, then come back to `make secrets`.
   make secrets && make deploy      # note the `trigger` URL
   ```
3. **Infrastructure.**
   ```bash
   cd terraform
   # fill terraform.tfvars (incl. agent_trigger_url) and
   # secrets.auto.tfvars (copy the .example; it lists each token's scopes)
   terraform init && terraform apply
   terraform output -json agent_env     # → agent/.env, then make secrets again
   ```
4. **Database.**
   ```bash
   terraform output -json supabase_env | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> ../supabase/.env
   cd ../supabase && make push-production
   ```
5. **Clerk.** Register the webhook `https://<domain>/api/webhooks/clerk` for
   `user.created` and `user.deleted`, put its signing secret in
   `secrets.auto.tfvars`, and re-apply. Verify the Clerk DNS records.
6. **Deploy.** `git push` to `main`.

See [terraform/README.md](terraform/README.md) for details.
