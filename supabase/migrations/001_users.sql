-- Migration 001: Users and the current_app_user_id() helper
--
-- Each row maps a Clerk user to an internal UUID that every user-owned table
-- references. Rows are created and deleted only by the Clerk webhook, which
-- uses the secret key and so bypasses RLS; users may read their own row.
--
-- Clerk session tokens are passed to Supabase as access tokens, so
-- auth.jwt()->>'sub' is the Clerk user id. current_app_user_id() resolves it
-- to users.id; ownership policies compare against it so that clerk_user_id
-- appears only here, which keeps the auth provider swappable.

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Clerk user id to internal UUID mapping, synced by the Clerk webhook.';
COMMENT ON COLUMN users.id IS 'Internal user id referenced by every user-owned table.';
COMMENT ON COLUMN users.clerk_user_id IS 'Clerk user id; the sub claim of Clerk session tokens.';
COMMENT ON COLUMN users.created_at IS 'When the webhook created the row.';

-- STABLE + SECURITY DEFINER: evaluated once per query when wrapped in
-- (SELECT ...), and able to read users regardless of the caller's RLS.
-- search_path = '' guards against search_path injection.
CREATE FUNCTION current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.users WHERE clerk_user_id = (SELECT auth.jwt()->>'sub')
$$;

COMMENT ON FUNCTION current_app_user_id() IS
  'users.id of the authenticated Clerk user, or NULL when no row exists.';

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY "users read their own row"
  ON users FOR SELECT TO authenticated
  USING (clerk_user_id = (SELECT auth.jwt()->>'sub'));
