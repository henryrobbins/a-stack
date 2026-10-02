import { Webhook } from 'standardwebhooks';
import { afterEach, describe, expect, test } from 'vitest';

import { POST } from '@/app/api/webhooks/clerk/route';
import { createSecretClient } from '@/lib/supabase/secret';
import { cleanupUser, seedUser, testUserId } from './helpers';

function signedRequest(type: string, data: object): Request {
  // Svix secrets are `whsec_<base64>`; standardwebhooks takes the base64 part.
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET!.replace(
    /^whsec_/,
    ''
  );
  const id = `msg_${crypto.randomUUID()}`;
  const timestamp = new Date();
  const payload = JSON.stringify({ type, data, object: 'event' });
  const signature = new Webhook(secret).sign(id, timestamp, payload);
  return new Request('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': id,
      'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
      'svix-signature': signature,
    },
    body: payload,
  });
}

async function findUser(clerkUserId: string) {
  const { data } = await createSecretClient()
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();
  return data;
}

describe('POST /api/webhooks/clerk', () => {
  const ids: string[] = [];
  const newId = () => {
    const id = testUserId();
    ids.push(id);
    return id;
  };

  afterEach(async () => {
    await cleanupUser(...ids.splice(0));
  });

  test('user.created inserts a users row', async () => {
    const id = newId();

    const res = await POST(signedRequest('user.created', { id }) as never);

    expect(res.status).toBe(200);
    expect(await findUser(id)).not.toBeNull();
  });

  test('user.deleted removes the row and everything it owns', async () => {
    const id = newId();
    const userId = await seedUser(id);
    await createSecretClient()
      .from('chats')
      .insert({ user_id: userId, title: 't', model: 'm' });

    const res = await POST(signedRequest('user.deleted', { id }) as never);

    expect(res.status).toBe(200);
    expect(await findUser(id)).toBeNull();
    const { count } = await createSecretClient()
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    expect(count).toBe(0);
  });

  test('rejects an invalid signature', async () => {
    const id = newId();
    const req = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'user.created', data: { id } }),
    });

    const res = await POST(req as never);

    expect(res.status).toBe(400);
    expect(await findUser(id)).toBeNull();
  });

  test('ignores other event types', async () => {
    const id = newId();

    const res = await POST(signedRequest('user.updated', { id }) as never);

    expect(res.status).toBe(200);
    expect(await findUser(id)).toBeNull();
  });
});
