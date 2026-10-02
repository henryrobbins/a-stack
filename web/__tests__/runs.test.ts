import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { cancelRun, getRun, startRun } from '@/lib/actions/runs';
import { createSecretClient } from '@/lib/supabase/secret';
import {
  cleanupUser,
  mockAuth,
  mockUnauthenticated,
  seedUser,
  testUserId,
} from './helpers';

// A stand-in for the agent service's trigger endpoint.
const received: { body: unknown; secret: unknown }[] = [];
let triggerStatus = 200;
let server: Server;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      received.push({
        body: JSON.parse(body),
        secret: req.headers['x-trigger-secret'],
      });
      res.writeHead(triggerStatus).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  process.env.AGENT_TRIGGER_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.AGENT_TRIGGER_SECRET = 'trigger-secret';
});

afterAll(() => {
  server.close();
});

async function makeAgent(clerkUserId: string): Promise<string> {
  const db = createSecretClient();
  const { data: user } = await db
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single();
  const { data } = await db
    .from('agents')
    .insert({
      user_id: user!.id,
      name: 'A',
      instructions: 'i',
      model: 'claude-haiku-4-5',
    })
    .select('id')
    .single();
  return data!.id;
}

async function rawRun(runId: string) {
  const { data } = await createSecretClient()
    .from('agent_runs')
    .select('status, error, cancel_requested, prompt')
    .eq('id', runId)
    .single();
  return data!;
}

describe('run actions', () => {
  const ids: string[] = [];
  const signIn = async () => {
    const id = testUserId();
    ids.push(id);
    await seedUser(id);
    await mockAuth(id);
    return id;
  };

  afterEach(async () => {
    received.length = 0;
    triggerStatus = 200;
    await mockUnauthenticated();
    await cleanupUser(...ids.splice(0));
  });

  test('startRun queues the run and triggers the agent service', async () => {
    const agentId = await makeAgent(await signIn());

    const runId = await startRun(agentId, 'What is 2 + 2?');

    expect(await rawRun(runId)).toMatchObject({
      status: 'queued',
      prompt: 'What is 2 + 2?',
    });
    expect(received).toEqual([
      { body: { run_id: runId }, secret: 'trigger-secret' },
    ]);
  });

  test('startRun marks the run failed when the trigger is refused', async () => {
    const agentId = await makeAgent(await signIn());
    triggerStatus = 500;

    const runId = await startRun(agentId, 'hi');

    const run = await rawRun(runId);
    expect(run.status).toBe('failed');
    expect(run.error).toContain('500');
  });

  test('startRun marks the run failed when the service is unreachable', async () => {
    const agentId = await makeAgent(await signIn());
    const url = process.env.AGENT_TRIGGER_URL;
    process.env.AGENT_TRIGGER_URL = 'http://127.0.0.1:1';

    try {
      const runId = await startRun(agentId, 'hi');
      expect((await rawRun(runId)).status).toBe('failed');
    } finally {
      process.env.AGENT_TRIGGER_URL = url;
    }
  });

  test('startRun refuses another user’s agent', async () => {
    const agentId = await makeAgent(await signIn());
    await signIn();

    await expect(startRun(agentId, 'hi')).rejects.toThrow();
    expect(received).toEqual([]);
  });

  test('cancelRun flags only the caller’s run', async () => {
    const agentId = await makeAgent(await signIn());
    const runId = await startRun(agentId, 'hi');

    await signIn();
    await cancelRun(runId);
    expect((await rawRun(runId)).cancel_requested).toBe(false);
    expect(await getRun(runId)).toBeNull();

    await mockAuth(ids[0]);
    await cancelRun(runId);
    expect((await rawRun(runId)).cancel_requested).toBe(true);
    expect(await getRun(runId)).toMatchObject({
      id: runId,
      cancel_requested: true,
    });
  });
});
