# DNS for Vercel and the Clerk production instance. Every record must be
# DNS-only (unproxied) for Vercel and Clerk to verify it.

locals {
  dns_records = {
    root = { name = var.domain, type = "A", content = "76.76.21.21" }
    www  = { name = "www", type = "CNAME", content = "cname.vercel-dns.com" }

    clerk_frontend_api = { name = "clerk", type = "CNAME", content = "frontend-api.clerk.services" }
    clerk_accounts     = { name = "accounts", type = "CNAME", content = "accounts.clerk.services" }
    clerk_mail         = { name = "clkmail", type = "CNAME", content = "mail.${var.clerk_dkim_id}.clerk.services" }
    clerk_dkim1        = { name = "clk._domainkey", type = "CNAME", content = "dkim1.${var.clerk_dkim_id}.clerk.services" }
    clerk_dkim2        = { name = "clk2._domainkey", type = "CNAME", content = "dkim2.${var.clerk_dkim_id}.clerk.services" }
  }
}

resource "cloudflare_dns_record" "main" {
  for_each = local.dns_records

  zone_id = var.cloudflare_zone_id
  name    = each.value.name
  type    = each.value.type
  content = each.value.content
  ttl     = 1 # automatic
  proxied = false
}
