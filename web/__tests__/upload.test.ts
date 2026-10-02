import { createClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, test } from 'vitest';

import { createSecretClient } from '@/lib/supabase/secret';
import { uploadFile } from '@/lib/upload';
import type { Database } from '@/types/database';
import { cleanupUser, seedUser, signToken, testUserId } from './helpers';

function clientFor(clerkUserId: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { accessToken: () => signToken(clerkUserId) }
  );
}

async function fileCount(userId: string) {
  const { count } = await createSecretClient()
    .from('files')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count;
}

describe('uploadFile', () => {
  const ids: string[] = [];
  const newUser = async () => {
    const clerkId = testUserId();
    ids.push(clerkId);
    return { clerkId, id: await seedUser(clerkId) };
  };

  afterEach(async () => {
    await cleanupUser(...ids.splice(0));
  });

  test('stores the object under the user’s folder and records it', async () => {
    const user = await newUser();
    const file = new File(['a,b\n1,2\n'], 'data.csv', { type: 'text/csv' });

    const uploaded = await uploadFile(
      clientFor(user.clerkId),
      user.clerkId,
      file
    );

    const { data } = await createSecretClient()
      .from('files')
      .select('name, content_type, size_bytes, storage_path')
      .eq('id', uploaded.id)
      .single();
    expect(data).toMatchObject({
      name: 'data.csv',
      content_type: 'text/csv',
      size_bytes: 8,
    });
    expect(data!.storage_path.startsWith(`${user.clerkId}/`)).toBe(true);
  });

  test('rejects a disallowed type without recording a file', async () => {
    const user = await newUser();
    const file = new File(['x'], 'run.sh', { type: 'application/x-sh' });

    await expect(
      uploadFile(clientFor(user.clerkId), user.clerkId, file)
    ).rejects.toThrow('unsupported file type');
    expect(await fileCount(user.id)).toBe(0);
  });

  test('storage refuses writes into another user’s folder', async () => {
    const alice = await newUser();
    const bob = await newUser();
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });

    await expect(
      uploadFile(clientFor(bob.clerkId), alice.clerkId, file)
    ).rejects.toThrow('row-level security');
    expect(await fileCount(bob.id)).toBe(0);
  });

  test('a files row cannot point into another user’s folder', async () => {
    const alice = await newUser();
    const bob = await newUser();

    const { error } = await clientFor(bob.clerkId)
      .from('files')
      .insert({
        name: 'stolen.txt',
        content_type: 'text/plain',
        size_bytes: 1,
        storage_path: `${alice.clerkId}/stolen.txt`,
      });

    expect(error?.message).toContain('row-level security');
    expect(await fileCount(bob.id)).toBe(0);
  });
});
