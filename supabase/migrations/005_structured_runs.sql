-- Migration 005: Structured output runs
--
-- Each call to the structured-output endpoint records its prompt, schema, and
-- either the validated output or the error, written by the API under RLS.

CREATE TABLE structured_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT current_app_user_id()
    REFERENCES users (id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  schema JSONB NOT NULL,
  output JSONB,
  error TEXT,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE structured_runs IS 'One structured-output request and its result.';
COMMENT ON COLUMN structured_runs.id IS 'Run id.';
COMMENT ON COLUMN structured_runs.user_id IS 'Owner; defaults to the calling user.';
COMMENT ON COLUMN structured_runs.prompt IS 'The user prompt.';
COMMENT ON COLUMN structured_runs.schema IS 'JSON schema the output had to satisfy.';
COMMENT ON COLUMN structured_runs.output IS 'Validated JSON output, on success.';
COMMENT ON COLUMN structured_runs.error IS 'Error message, on failure.';
COMMENT ON COLUMN structured_runs.model IS 'Claude model id used.';
COMMENT ON COLUMN structured_runs.input_tokens IS 'Input tokens billed.';
COMMENT ON COLUMN structured_runs.output_tokens IS 'Output tokens billed.';
COMMENT ON COLUMN structured_runs.duration_ms IS 'Wall-clock duration of the Claude call.';
COMMENT ON COLUMN structured_runs.created_at IS 'Creation time.';

CREATE INDEX structured_runs_user_id_created_at_idx ON structured_runs (user_id, created_at DESC);

ALTER TABLE structured_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE structured_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY "owners read structured runs"
  ON structured_runs FOR SELECT TO authenticated
  USING ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners insert structured runs"
  ON structured_runs FOR INSERT TO authenticated
  WITH CHECK ((SELECT current_app_user_id()) = user_id);

GRANT SELECT, INSERT ON structured_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON structured_runs TO service_role;
