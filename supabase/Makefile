.PHONY: push-local push-production types dump-seed

-include .env

# The session-mode pooler (port 5432), because the direct db.<ref>.supabase.co
# host resolves to IPv6 only.
PROD_DB_URL = postgresql://postgres.$(PROD_PROJECT_REF):$(PROD_DB_PASSWORD)@$(PROD_POOLER_HOST):5432/postgres

push-local:
	supabase migration up

push-production:
	@test -n "$(PROD_PROJECT_REF)" || (echo "PROD_PROJECT_REF is unset; see .env.example" && exit 1)
	supabase db push --db-url '$(PROD_DB_URL)'

types:
	supabase gen types typescript --local --schema public > ../web/types/database.ts

# The CLI changes into the project root (the parent of supabase/) before
# resolving -f.
dump-seed:
	supabase db dump --local --data-only -f supabase/seed.sql
