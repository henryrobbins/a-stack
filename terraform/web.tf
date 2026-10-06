# One Vercel project serving both services in vercel.json: the Next.js app
# and the FastAPI app under /api/py. Preview deployments share production
# environment values (see ARCHITECTURE.md). The app is served at the
# project's *.vercel.app URL, which Vercel assigns.

locals {
  clerk_issuer = "https://${var.clerk_domain}"
  supabase_url = "https://${supabase_project.main.id}.supabase.co"
  # Public by design; the provider marks every key sensitive.
  supabase_publishable_key = nonsensitive(data.supabase_apikeys.main.publishable_key)

  vercel_env = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY    = var.clerk_publishable_key
    NEXT_PUBLIC_CLERK_SIGN_IN_URL        = "/sign-in"
    NEXT_PUBLIC_CLERK_SIGN_UP_URL        = "/sign-up"
    NEXT_PUBLIC_SUPABASE_URL             = local.supabase_url
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = local.supabase_publishable_key
    AGENT_TRIGGER_URL                    = var.agent_trigger_url
    # api/
    CLERK_JWKS_URL           = "${local.clerk_issuer}/.well-known/jwks.json"
    SUPABASE_URL             = local.supabase_url
    SUPABASE_PUBLISHABLE_KEY = local.supabase_publishable_key
  }

  vercel_sensitive_env = {
    CLERK_SECRET_KEY             = var.clerk_secret_key
    CLERK_WEBHOOK_SIGNING_SECRET = var.clerk_webhook_signing_secret
    SUPABASE_SECRET_KEY          = supabase_apikey.secret.api_key
    AGENT_TRIGGER_SECRET         = var.agent_trigger_secret
    ANTHROPIC_API_KEY            = var.anthropic_api_key
  }
}

resource "vercel_project" "main" {
  name      = var.project_name
  framework = "services"

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = "main"
  }

  resource_config = {
    fluid                    = true
    function_default_regions = ["iad1"]
    # Long enough for streamed chat replies.
    function_default_timeout = 300
  }
}

resource "vercel_project_environment_variable" "public" {
  for_each = local.vercel_env

  project_id = vercel_project.main.id
  key        = each.key
  value      = each.value
  sensitive  = false
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "sensitive" {
  for_each = nonsensitive(toset(keys(local.vercel_sensitive_env)))

  project_id = vercel_project.main.id
  key        = each.key
  value      = local.vercel_sensitive_env[each.key]
  sensitive  = true
  target     = ["production", "preview"]
}
