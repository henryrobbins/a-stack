# -----------------------------------------------------------------------------
# Non-sensitive (terraform.tfvars, committed)
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Name of the Vercel and Supabase projects"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository (owner/name) connected to Vercel"
  type        = string
}

variable "supabase_organization_id" {
  description = "Supabase organization that owns the project"
  type        = string
}

variable "supabase_region" {
  description = "Supabase region; keep it next to the Vercel function region (iad1)"
  type        = string
  default     = "us-east-1"
}

variable "clerk_publishable_key" {
  description = "Clerk development publishable key (pk_test_...)"
  type        = string
}

variable "clerk_domain" {
  description = "Clerk Frontend API host, without https:// (e.g. your-app-12.clerk.accounts.dev)"
  type        = string
}

variable "agent_trigger_url" {
  description = "Modal trigger endpoint URL printed by `make deploy` in agent/"
  type        = string
}

# -----------------------------------------------------------------------------
# Sensitive (secrets.auto.tfvars, git-ignored)
# -----------------------------------------------------------------------------

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "supabase_access_token" {
  description = "Supabase personal access token (sbp_...)"
  type        = string
  sensitive   = true
}

variable "supabase_database_password" {
  description = "Postgres password for the Supabase project"
  type        = string
  sensitive   = true
}

variable "clerk_secret_key" {
  description = "Clerk development secret key (sk_test_...)"
  type        = string
  sensitive   = true
}

variable "clerk_webhook_signing_secret" {
  description = "Signing secret of the Clerk webhook endpoint (whsec_...)"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key (sk-ant-...)"
  type        = string
  sensitive   = true
}

variable "agent_trigger_secret" {
  description = "Shared secret between the web app and the Modal trigger endpoint"
  type        = string
  sensitive   = true
}
