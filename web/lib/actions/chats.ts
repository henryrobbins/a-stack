'use server';

import { isModel } from '@/lib/models';
import { createClient } from '@/lib/supabase/server';

const TITLE_LENGTH = 60;

function toTitle(message: string): string {
  const line = message.trim().replace(/\s+/g, ' ');
  return line.length > TITLE_LENGTH
    ? `${line.slice(0, TITLE_LENGTH - 1)}…`
    : line;
}

/** Create a chat titled from its first message; returns the chat id. */
export async function createChat(
  firstMessage: string,
  model: string
): Promise<string> {
  if (!isModel(model)) {
    throw new Error(`Unknown model: ${model}`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chats')
    .insert({ title: toTitle(firstMessage), model })
    .select('id')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data.id;
}

export async function listChats() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, model, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
