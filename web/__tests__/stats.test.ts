import { afterEach, describe, expect, test } from 'vitest';

import { listSessionStats } from '@/lib/actions/stats';
import { createSecretClient } from '@/lib/supabase/secret';
import {
  cleanupUser,
  mockAuth,
  mockUnauthenticated,
  seedUser,
  testUserId,
} from './helpers';

async function seedSessions(userId: string) {
  const db = createSecretClient();
  const { data: chat } = await db
    .from('chats')
    .insert({ user_id: userId, title: 'A chat', model: 'claude-haiku-4-5' })
    .select('id')
    .single();
  await db.from('chat_messages').insert([
    {
      user_id: userId,
      chat_id: chat!.id,
      role: 'user',
      content: 'hi',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      user_id: userId,
      chat_id: chat!.id,
      role: 'assistant',
      content: 'hello',
      input_tokens: 10,
      output_tokens: 20,
      created_at: '2026-01-01T00:00:02Z',
    },
  ]);
  const { data: agent } = await db
    .from('agents')
    .insert({
      user_id: userId,
      name: 'Helper',
      instructions: 'i',
      model: 'claude-opus-5-5',
    })
    .select('id')
    .single();
  await db.from('agent_runs').insert({
    user_id: userId,
    agent_id: agent!.id,
    prompt: 'go',
    status: 'done',
    input_tokens: 100,
    output_tokens: 50,
    started_at: '2026-01-01T00:00:00Z',
    finished_at: '2026-01-01T00:00:05Z',
  });
  await db.from('structured_runs').insert({
    user_id: userId,
    prompt: 'extract',
    schema: {},
    error: 'bad schema',
    model: 'claude-sonnet-5-5',
    duration_ms: 300,
  });
}

describe('listSessionStats', () => {
  const ids: string[] = [];
  const newUser = async () => {
    const clerkId = testUserId();
    ids.push(clerkId);
    return { clerkId, id: await seedUser(clerkId) };
  };

  afterEach(async () => {
    await mockUnauthenticated();
    await cleanupUser(...ids.splice(0));
  });

  test('summarizes each kind of session', async () => {
    const user = await newUser();
    await seedSessions(user.id);
    await mockAuth(user.clerkId);

    const rows = await listSessionStats();

    const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
    expect(byKind.chat).toMatchObject({
      title: 'A chat',
      input_tokens: 10,
      output_tokens: 20,
      duration_ms: 2000,
      status: null,
    });
    expect(byKind.agent).toMatchObject({
      title: 'Helper',
      model: 'claude-opus-5-5',
      input_tokens: 100,
      duration_ms: 5000,
      status: 'done',
    });
    expect(byKind.structured).toMatchObject({
      title: 'extract',
      duration_ms: 300,
      status: 'failed',
    });
  });

  test('filters by kind', async () => {
    const user = await newUser();
    await seedSessions(user.id);
    await mockAuth(user.clerkId);

    const rows = await listSessionStats('agent');

    expect(rows.map((r) => r.kind)).toEqual(['agent']);
  });

  test('shows only the caller’s sessions', async () => {
    const alice = await newUser();
    const bob = await newUser();
    await seedSessions(alice.id);
    await mockAuth(bob.clerkId);

    expect(await listSessionStats()).toEqual([]);
  });
});
