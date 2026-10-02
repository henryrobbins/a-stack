terraform {
  required_version = ">= 1.9"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.18"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.11"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.26"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
