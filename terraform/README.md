# Terraform

Provisions production: the **Vercel** project (Next.js and FastAPI as Vercel
Services), the **Supabase** project with its secret key and Clerk third-party
auth, and **Cloudflare** DNS for Vercel and Clerk. State is local.

## Files

| File | Purpose |
|---|---|
| `providers.tf` | vercel, supabase, cloudflare providers |
| `variables.tf` | Inputs; sensitive ones are marked |
| `web.tf` | Vercel project, domains, environment variables |
| `database.tf` | Supabase project, secret key, Clerk third-party auth |
| `dns.tf` | Cloudflare records (all unproxied) |
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
terraform output -json agent_env      # for agent/.env (Modal secret)
```

## Not managed here

- **Clerk**: the instance and the webhook endpoint are configured in the
  Clerk dashboard; only keys are passed in.
- **Modal**: secrets and deploys go through `agent/Makefile`; the trigger
  URL and shared secret are inputs here.
- **Migrations**: `cd ../supabase && make push-production`.

Preview deployments receive the production environment values.
