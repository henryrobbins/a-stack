.PHONY: push-local push-production types dump-seed

-include .env

# The session-mode pooler, because the direct db.<ref>.supabase.co host
# resolves to IPv6 only.
POOLER_HOST = aws-1-us-east-1.pooler.supabase.com
PROD_DB_URL = postgresql://postgres.$(PROD_PROJECT_REF):$(PROD_DB_PASSWORD)@$(POOLER_HOST):5432/postgres

push-local:
	supabase migration up

push-production:
	@test -n "$(PROD_PROJECT_REF)" || (echo "PROD_PROJECT_REF is unset; see .env.example" && exit 1)
	supabase db push --db-url '$(PROD_DB_URL)'

types:
	supabase gen types typescript --local --schema public > ../web/types/database.ts

dump-seed:
	supabase db dump --local --data-only -f seed.sql
