# Non-sensitive values (committed). Secrets go in secrets.auto.tfvars.

project_name = "a-stack"
domain       = "a-stack.henryrobbins.com"

# owner/name of the GitHub repository connected to Vercel
github_repo = "henryrobbins/a-stack"

# Cloudflare dashboard → domain → Overview → Zone ID
cloudflare_zone_id = "327ea17c6dee2ba69dfff31cc2dfd950"

# Supabase dashboard → Organization settings → Organization slug
supabase_organization_id = "ezausddpgvbmkhdacsjc"

# Clerk dashboard (production instance) → API keys
clerk_publishable_key = "pk_live_Y2xlcmsuYS1zdGFjay5oZW5yeXJvYmJpbnMuY29tJA"

# Clerk dashboard → Domains: the id in dkim1.<id>.clerk.services
clerk_dkim_id = "xsoh8t0is8oc"

# Printed by `cd ../agent && make deploy` (the `trigger` web endpoint)
agent_trigger_url = "https://henryrobbins--a-stack-agent-trigger.modal.run"
