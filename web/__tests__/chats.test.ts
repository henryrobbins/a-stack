import { afterEach, describe, expect, test } from 'vitest';

import { createChat, listChats } from '@/lib/actions/chats';
import {
  cleanupUser,
  mockAuth,
  mockUnauthenticated,
  seedUser,
  testUserId,
} from './helpers';

describe('chat actions', () => {
  const ids: string[] = [];
  const newUser = async () => {
    const id = testUserId();
    ids.push(id);
    await seedUser(id);
    return id;
  };

  afterEach(async () => {
    await mockUnauthenticated();
    await cleanupUser(...ids.splice(0));
  });

  test('createChat titles the chat with the first message', async () => {
    await mockAuth(await newUser());

    const id = await createChat(
      'What is the capital of France?',
      'claude-haiku-4-5'
    );

    const [chat] = await listChats();
    expect(chat).toMatchObject({
      id,
      title: 'What is the capital of France?',
      model: 'claude-haiku-4-5',
    });
  });

  test('createChat truncates long titles', async () => {
    await mockAuth(await newUser());

    await createChat('x'.repeat(200), 'claude-haiku-4-5');

    const [chat] = await listChats();
    expect(chat.title).toBe(`${'x'.repeat(59)}…`);
  });

  test('createChat rejects unknown models', async () => {
    await mockAuth(await newUser());

    await expect(createChat('hi', 'gpt-9')).rejects.toThrow('Unknown model');
  });

  test('listChats returns only the caller’s chats', async () => {
    const alice = await newUser();
    const bob = await newUser();
    await mockAuth(alice);
    await createChat('alice chat', 'claude-haiku-4-5');
    await mockAuth(bob);

    expect(await listChats()).toEqual([]);
  });
});
