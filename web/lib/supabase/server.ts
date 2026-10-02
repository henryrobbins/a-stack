import { auth } from '@clerk/nextjs/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

/** Server-side Supabase client acting as the signed-in Clerk user (RLS). */
export async function createClient() {
  const { getToken } = await auth();
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { accessToken: () => getToken() }
  );
}
