'use server';

import { createClient } from '@/lib/supabase/server';

const TRIGGER_TIMEOUT_MS = 10_000;

async function trigger(runId: string): Promise<string | null> {
  try {
    const res = await fetch(process.env.AGENT_TRIGGER_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trigger-Secret': process.env.AGENT_TRIGGER_SECRET ?? '',
      },
      body: JSON.stringify({ run_id: runId }),
      signal: AbortSignal.timeout(TRIGGER_TIMEOUT_MS),
    });
    return res.ok ? null : `Agent service returned ${res.status}`;
  } catch (err) {
    return `Agent service unreachable: ${err instanceof Error ? err.message : err}`;
  }
}

/**
 * Queue a run of one of the caller's agents and hand it to the agent
 * service. Returns the run id; if the service cannot be reached the run is
 * recorded as failed.
 */
export async function startRun(
  agentId: string,
  prompt: string
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agent_runs')
    .insert({ agent_id: agentId, prompt: prompt.trim() })
    .select('id')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  const failure = await trigger(data.id);
  if (failure) {
    await supabase.rpc('fail_queued_run', {
      run_id: data.id,
      message: failure,
    });
  }
  return data.id;
}

/** Ask the worker to stop a run; it stops between turns. */
export async function cancelRun(runId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('agent_runs')
    .update({ cancel_requested: true })
    .eq('id', runId);
}

export async function getRun(runId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('agent_runs')
    .select(
      'id, agent_id, prompt, status, cancel_requested, activity, result, error, input_tokens, output_tokens, cost_usd, created_at, started_at, finished_at, agents(name, model)'
    )
    .eq('id', runId)
    .maybeSingle();
  return data;
}

export async function listRuns(agentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, prompt, status, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
