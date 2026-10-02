import { afterEach, describe, expect, test } from 'vitest';

import { getAgent, listAgents, saveAgent } from '@/lib/actions/agents';
import {
  cleanupUser,
  mockAuth,
  mockUnauthenticated,
  seedUser,
  testUserId,
} from './helpers';

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of [value].flat()) data.append(key, v);
  }
  return data;
}

const VALID = {
  name: 'Helper',
  instructions: 'Answer briefly.',
  model: 'claude-haiku-4-5',
  tools: ['calculator', 'current_time'],
};

async function redirectTarget(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(
    () => null,
    (e: Error) => e
  );
  expect(error?.message).toMatch(/^NEXT_REDIRECT /);
  return error!.message.replace('NEXT_REDIRECT ', '');
}

describe('agent actions', () => {
  const ids: string[] = [];
  const signIn = async () => {
    const id = testUserId();
    ids.push(id);
    await seedUser(id);
    await mockAuth(id);
    return id;
  };

  afterEach(async () => {
    await mockUnauthenticated();
    await cleanupUser(...ids.splice(0));
  });

  test('saveAgent creates an agent and redirects to it', async () => {
    await signIn();

    const target = await redirectTarget(saveAgent({}, form(VALID)));

    const [agent] = await listAgents();
    expect(target).toBe(`/agents/${agent.id}`);
    expect(agent).toMatchObject({
      name: 'Helper',
      model: 'claude-haiku-4-5',
      tools: ['calculator', 'current_time'],
    });
  });

  test('saveAgent updates an existing agent', async () => {
    await signIn();
    await redirectTarget(saveAgent({}, form(VALID)));
    const [agent] = await listAgents();

    await redirectTarget(
      saveAgent(
        {},
        form({ ...VALID, id: agent.id, name: 'Renamed', tools: [] })
      )
    );

    expect(await getAgent(agent.id)).toMatchObject({
      name: 'Renamed',
      tools: [],
    });
  });

  test('saveAgent reports invalid input', async () => {
    await signIn();

    expect(await saveAgent({}, form({ ...VALID, name: ' ' }))).toEqual({
      error: 'Name is required.',
    });
    expect(await saveAgent({}, form({ ...VALID, model: 'gpt-9' }))).toEqual({
      error: 'Unknown model.',
    });
    expect(await saveAgent({}, form({ ...VALID, tools: ['shell'] }))).toEqual({
      error: 'Unknown tool: shell.',
    });
    expect(await listAgents()).toEqual([]);
  });

  test('saveAgent cannot edit another user’s agent', async () => {
    await signIn();
    await redirectTarget(saveAgent({}, form(VALID)));
    const [agent] = await listAgents();
    await signIn();

    expect(
      await saveAgent({}, form({ ...VALID, id: agent.id, name: 'Stolen' }))
    ).toEqual({ error: 'Agent not found.' });
    expect(await getAgent(agent.id)).toBeNull();
  });
});
