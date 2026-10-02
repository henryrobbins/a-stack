'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { AGENT_TOOLS } from '@/lib/agents';
import { isModel } from '@/lib/models';
import { createClient } from '@/lib/supabase/server';

export interface SaveAgentState {
  error?: string;
}

/**
 * Create an agent, or update one when the form carries an `id`. Redirects to
 * the agent on success; returns a message for invalid input.
 */
export async function saveAgent(
  _prev: SaveAgentState,
  form: FormData
): Promise<SaveAgentState> {
  const id = String(form.get('id') ?? '');
  const name = String(form.get('name') ?? '').trim();
  const instructions = String(form.get('instructions') ?? '').trim();
  const model = String(form.get('model') ?? '');
  const tools = form.getAll('tools').map(String);

  if (!name) {
    return { error: 'Name is required.' };
  }
  if (!isModel(model)) {
    return { error: 'Unknown model.' };
  }
  const unknown = tools.find((t) => !AGENT_TOOLS.some((tool) => tool.id === t));
  if (unknown) {
    return { error: `Unknown tool: ${unknown}.` };
  }

  const supabase = await createClient();
  const fields = { name, instructions, model, tools };
  const { data, error } = id
    ? await supabase
        .from('agents')
        .update(fields)
        .eq('id', id)
        .select('id')
        .maybeSingle()
    : await supabase.from('agents').insert(fields).select('id').single();
  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return { error: 'Agent not found.' };
  }
  revalidatePath('/agents');
  redirect(`/agents/${data.id}`);
}

export async function listAgents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, model, tools, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getAgent(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('agents')
    .select('id, name, instructions, model, tools')
    .eq('id', id)
    .maybeSingle();
  return data;
}
