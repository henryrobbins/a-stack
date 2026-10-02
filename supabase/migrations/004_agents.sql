-- Migration 004: Agents and agent runs
--
-- An agent is a saved configuration (instructions, model, tools). A run is
-- one execution, queued by the web app and carried out by the Modal worker:
--
--   web inserts a run (status 'queued') under RLS and triggers Modal ->
--   the worker claims it ('queued' -> 'running') with the secret key, streams
--   a compact activity feed into the row, and finishes it.
--
-- Owners may set only cancel_requested on a run after creating it; column
-- privileges enforce this, since RLS policies are row-level. Inserts are
-- likewise limited to agent_id and prompt so a client cannot forge results.

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT current_app_user_id()
    REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL,
  tools TEXT[] NOT NULL DEFAULT '{}'
    CHECK (tools <@ ARRAY['calculator', 'current_time', 'read_file']),
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE agents IS 'A saved agent configuration.';
COMMENT ON COLUMN agents.id IS 'Agent id.';
COMMENT ON COLUMN agents.user_id IS 'Owner; defaults to the calling user.';
COMMENT ON COLUMN agents.name IS 'Display name.';
COMMENT ON COLUMN agents.instructions IS 'System prompt for runs.';
COMMENT ON COLUMN agents.tools IS 'Enabled tools: calculator, current_time, read_file.';
COMMENT ON COLUMN agents.model IS 'Claude model id used for runs.';
COMMENT ON COLUMN agents.created_at IS 'Creation time.';

CREATE INDEX agents_user_id_idx ON agents (user_id);

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT current_app_user_id()
    REFERENCES users (id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'done', 'failed', 'canceled')),
  cancel_requested BOOLEAN NOT NULL DEFAULT false,
  activity JSONB NOT NULL DEFAULT '[]'::jsonb,
  result TEXT,
  error TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(12, 6),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_runs IS 'One execution of an agent, carried out by the Modal worker.';
COMMENT ON COLUMN agent_runs.id IS 'Run id.';
COMMENT ON COLUMN agent_runs.user_id IS 'Owner; defaults to the calling user.';
COMMENT ON COLUMN agent_runs.agent_id IS 'The agent being run.';
COMMENT ON COLUMN agent_runs.prompt IS 'The user prompt for this run.';
COMMENT ON COLUMN agent_runs.status IS 'queued, running, done, failed, or canceled.';
COMMENT ON COLUMN agent_runs.cancel_requested IS 'Set by the owner; the worker stops between turns.';
COMMENT ON COLUMN agent_runs.activity IS 'Compact feed of {kind, text} events, rewritten as the run progresses.';
COMMENT ON COLUMN agent_runs.result IS 'Final answer, when done.';
COMMENT ON COLUMN agent_runs.error IS 'Failure detail, when failed.';
COMMENT ON COLUMN agent_runs.input_tokens IS 'Total input tokens across turns.';
COMMENT ON COLUMN agent_runs.output_tokens IS 'Total output tokens across turns.';
COMMENT ON COLUMN agent_runs.cost_usd IS 'Total cost reported by the Agent SDK.';
COMMENT ON COLUMN agent_runs.started_at IS 'When the worker claimed the run.';
COMMENT ON COLUMN agent_runs.finished_at IS 'When the run reached a terminal status.';
COMMENT ON COLUMN agent_runs.created_at IS 'When the run was queued.';

CREATE INDEX agent_runs_agent_id_created_at_idx ON agent_runs (agent_id, created_at DESC);
CREATE INDEX agent_runs_user_id_idx ON agent_runs (user_id);
CREATE INDEX agent_runs_queued_idx ON agent_runs (created_at) WHERE status = 'queued';

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY "owners read agents"
  ON agents FOR SELECT TO authenticated
  USING ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners insert agents"
  ON agents FOR INSERT TO authenticated
  WITH CHECK ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners update agents"
  ON agents FOR UPDATE TO authenticated
  USING ((SELECT current_app_user_id()) = user_id)
  WITH CHECK ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners delete agents"
  ON agents FOR DELETE TO authenticated
  USING ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners read agent runs"
  ON agent_runs FOR SELECT TO authenticated
  USING ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners insert agent runs"
  ON agent_runs FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT current_app_user_id()) = user_id
    AND agent_id IN (SELECT id FROM agents)
  );

CREATE POLICY "owners update agent runs"
  ON agent_runs FOR UPDATE TO authenticated
  USING ((SELECT current_app_user_id()) = user_id)
  WITH CHECK ((SELECT current_app_user_id()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON agents TO authenticated;
GRANT SELECT ON agent_runs TO authenticated;
GRANT INSERT (agent_id, prompt) ON agent_runs TO authenticated;
GRANT UPDATE (cancel_requested) ON agent_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agents, agent_runs TO service_role;

-- When the web app cannot reach the worker, the run would otherwise sit in
-- 'queued' forever. Owners cannot write status directly, so this function
-- lets them fail their own run, and only while it is still queued.
CREATE FUNCTION fail_queued_run(run_id UUID, message TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.agent_runs
  SET status = 'failed', error = message, finished_at = now()
  WHERE id = run_id
    AND status = 'queued'
    AND user_id = (SELECT public.current_app_user_id())
$$;

COMMENT ON FUNCTION fail_queued_run(UUID, TEXT) IS
  'Marks the caller''s own queued run as failed with the given message.';

REVOKE EXECUTE ON FUNCTION fail_queued_run(UUID, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION fail_queued_run(UUID, TEXT) TO authenticated;
