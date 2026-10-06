# Generate the env files for production tasks, e.g.:
#   terraform output -json supabase_env | jq -r 'to_entries[] | "\(.key)=\(.value)"' > ../supabase/.env

output "supabase_env" {
  description = "supabase/.env values for `make push-production`"
  sensitive   = true
  value = {
    PROD_PROJECT_REF = supabase_project.main.id
    PROD_DB_PASSWORD = var.supabase_database_password
    PROD_POOLER_HOST = regex("@([^:/]+)", values(data.supabase_pooler.main.url)[0])[0]
  }
}

output "agent_env" {
  description = "agent/.env.production values for `make secrets` (Modal)"
  sensitive   = true
  value = {
    SUPABASE_URL         = local.supabase_url
    SUPABASE_SECRET_KEY  = supabase_apikey.secret.api_key
    ANTHROPIC_API_KEY    = var.anthropic_api_key
    AGENT_TRIGGER_SECRET = var.agent_trigger_secret
  }
}

output "vercel_env" {
  description = "Environment variables set on the Vercel project"
  sensitive   = true
  value       = merge(local.vercel_env, local.vercel_sensitive_env)
}
