# Terraform

Provisions production: the **Vercel** project (Next.js and FastAPI as Vercel
Services), the **Supabase** project with its secret key and Clerk third-party
auth. The app is served at the project's `*.vercel.app` URL and Clerk runs
a development instance, so there is no DNS to manage. State is local.

## Files

| File | Purpose |
|---|---|
| `providers.tf` | vercel, supabase providers |
| `variables.tf` | Inputs; sensitive ones are marked |
| `web.tf` | Vercel project, environment variables |
| `database.tf` | Supabase project, secret key, Clerk third-party auth |
| `outputs.tf` | Sensitive maps for `supabase/.env` and `agent/.env` |

## Variables

- `terraform.tfvars` — non-sensitive values, committed.
- `secrets.auto.tfvars` — tokens and keys, git-ignored and loaded
  automatically. Copy `secrets.auto.tfvars.example`, which documents the
  scope each token needs.

## Usage

```bash
terraform init
terraform plan
terraform apply
terraform output -json supabase_env   # for supabase/.env
terraform output -json agent_env      # for agent/.env.production (Modal secret)
```

## Not managed here

- **Clerk**: the instance and the webhook endpoint are configured in the
  Clerk dashboard; only keys are passed in.
- **Modal**: secrets and deploys go through `agent/Makefile`; the trigger
  URL and shared secret are inputs here.
- **Migrations**: `cd ../supabase && make push-production`.

Preview deployments receive the production environment values.
