import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

/**
 * Supabase client with the secret key, which bypasses RLS. Server-only, and
 * reserved for code acting without a user session (the Clerk webhook).
 */
export function createSecretClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
