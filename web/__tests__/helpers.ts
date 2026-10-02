import { SignJWT } from 'jose';
import { vi } from 'vitest';

import { createSecretClient } from '@/lib/supabase/secret';

export function testUserId(): string {
  return `test_user_${crypto.randomUUID()}`;
}

/**
 * A Supabase access token for `clerkUserId`, signed with the local JWT
 * secret. Local Supabase accepts it alongside Clerk tokens, so RLS runs for
 * real against the same `sub` claim a Clerk session token would carry.
 */
export function signToken(clerkUserId: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
  return new SignJWT({ sub: clerkUserId, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

/** Makes Clerk's `auth()` report `clerkUserId` as signed in. */
export async function mockAuth(clerkUserId: string) {
  const { auth } = await import('@clerk/nextjs/server');
  vi.mocked(auth).mockResolvedValue({
    userId: clerkUserId,
    getToken: () => signToken(clerkUserId),
    // biome-ignore lint/suspicious/noExplicitAny: partial Clerk auth object
  } as any);
}

export async function mockUnauthenticated() {
  const { auth } = await import('@clerk/nextjs/server');
  vi.mocked(auth).mockResolvedValue({
    userId: null,
    getToken: async () => null,
    // biome-ignore lint/suspicious/noExplicitAny: partial Clerk auth object
  } as any);
}

/** Inserts a users row, as the Clerk webhook would, and returns its id. */
export async function seedUser(clerkUserId: string): Promise<string> {
  const { data, error } = await createSecretClient()
    .from('users')
    .insert({ clerk_user_id: clerkUserId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Deletes users rows; everything they own cascades. */
export async function cleanupUser(...clerkUserIds: string[]) {
  await createSecretClient()
    .from('users')
    .delete()
    .in('clerk_user_id', clerkUserIds);
}
