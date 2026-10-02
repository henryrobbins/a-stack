# Non-sensitive values (committed). Secrets go in secrets.auto.tfvars.

project_name = "a-stack"
domain       = "example.com"

# owner/name of the GitHub repository connected to Vercel
github_repo = "your-org/a-stack"

# Cloudflare dashboard → domain → Overview → Zone ID
cloudflare_zone_id = "0000000000000000000000000000000"

# Supabase dashboard → Organization settings → Organization slug
supabase_organization_id = "your-org-slug"

# Clerk dashboard (production instance) → API keys
clerk_publishable_key = "pk_live_..."

# Clerk dashboard → Domains: the id in dkim1.<id>.clerk.services
clerk_dkim_id = "abc123"

# Printed by `cd ../agent && make deploy` (the `trigger` web endpoint)
agent_trigger_url = "https://your-workspace--a-stack-agent-trigger.modal.run"
