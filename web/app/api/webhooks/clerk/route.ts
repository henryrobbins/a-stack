import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { type NextRequest, NextResponse } from 'next/server';

import { createSecretClient } from '@/lib/supabase/secret';

/** Syncs Clerk users into `users`. Register for user.created and user.deleted. */
export async function POST(req: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createSecretClient();

  if (evt.type === 'user.created') {
    const { error } = await supabase
      .from('users')
      .upsert(
        { clerk_user_id: evt.data.id },
        { onConflict: 'clerk_user_id', ignoreDuplicates: true }
      );
    if (error) {
      console.error('Failed to create user', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  if (evt.type === 'user.deleted' && evt.data.id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('clerk_user_id', evt.data.id);
    if (error) {
      console.error('Failed to delete user', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
