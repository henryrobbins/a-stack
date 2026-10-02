# The Supabase project, its API keys, and trust in Clerk session tokens.
# Migrations are applied separately: `cd ../supabase && make push-production`.

resource "supabase_project" "main" {
  organization_id   = var.supabase_organization_id
  name              = var.project_name
  database_password = var.supabase_database_password
  region            = var.supabase_region

  lifecycle {
    ignore_changes = [database_password]
  }
}

# The publishable key is created with the project.
data "supabase_apikeys" "main" {
  project_ref = supabase_project.main.id
}

# Which pooler cluster hosts a project varies, so it is read rather than
# assumed from the region.
data "supabase_pooler" "main" {
  project_ref = supabase_project.main.id
}

# A secret key, held by the Clerk webhook (Vercel) and the agent worker
# (Modal) only.
resource "supabase_apikey" "secret" {
  project_ref = supabase_project.main.id
  name        = "server"
}

# RLS sees the Clerk user id as auth.jwt()->>'sub'.
resource "supabase_third_party_auth" "clerk" {
  project_ref     = supabase_project.main.id
  oidc_issuer_url = local.clerk_issuer
}
