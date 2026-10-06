# Non-sensitive values (committed). Secrets go in secrets.auto.tfvars.

project_name = "a-stack"

# owner/name of the GitHub repository connected to Vercel
github_repo = "henryrobbins/a-stack"

# Supabase dashboard → Organization settings → Organization slug
supabase_organization_id = "ezausddpgvbmkhdacsjc"

# Clerk dashboard (development instance) → API keys
clerk_publishable_key = "pk_test_bmVhcmJ5LWRvZy04OTM3LmNsZXJrLmFjY291bnRzLmRldiQ"

# Clerk dashboard (development instance) → API keys → Frontend API URL,
# without https://
clerk_domain = "nearby-dog-8937.clerk.accounts.dev"

# Printed by `cd ../agent && make deploy` (the `trigger` web endpoint)
agent_trigger_url = "https://henryrobbins--a-stack-agent-trigger.modal.run"
