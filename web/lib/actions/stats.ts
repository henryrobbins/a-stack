'use server';

import type { SessionKind } from '@/lib/sessions';
import { createClient } from '@/lib/supabase/server';

/** The caller's sessions across all demos, newest first. */
export async function listSessionStats(kind?: SessionKind) {
  const supabase = await createClient();
  let query = supabase
    .from('session_stats')
    .select('*')
    .order('created_at', { ascending: false });
  if (kind) {
    query = query.eq('kind', kind);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
