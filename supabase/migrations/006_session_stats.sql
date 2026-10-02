-- Migration 006: session_stats view
--
-- One row per session across the three demos, for the stats page. The view
-- runs with the caller's privileges (security_invoker), so the underlying
-- tables' RLS limits it to the caller's own sessions.

CREATE VIEW session_stats WITH (security_invoker = true) AS
SELECT
  'chat'::TEXT AS kind,
  c.id,
  c.title,
  c.created_at,
  c.model,
  COALESCE(SUM(m.input_tokens), 0)::BIGINT AS input_tokens,
  COALESCE(SUM(m.output_tokens), 0)::BIGINT AS output_tokens,
  (EXTRACT(EPOCH FROM MAX(m.created_at) - MIN(m.created_at)) * 1000)::BIGINT
    AS duration_ms,
  NULL::TEXT AS status
FROM chats c
LEFT JOIN chat_messages m ON m.chat_id = c.id
GROUP BY c.id

UNION ALL

SELECT
  'agent'::TEXT,
  r.id,
  a.name,
  r.created_at,
  a.model,
  COALESCE(r.input_tokens, 0)::BIGINT,
  COALESCE(r.output_tokens, 0)::BIGINT,
  (EXTRACT(EPOCH FROM r.finished_at - r.started_at) * 1000)::BIGINT,
  r.status
FROM agent_runs r
JOIN agents a ON a.id = r.agent_id

UNION ALL

SELECT
  'structured'::TEXT,
  s.id,
  left(s.prompt, 80),
  s.created_at,
  s.model,
  COALESCE(s.input_tokens, 0)::BIGINT,
  COALESCE(s.output_tokens, 0)::BIGINT,
  s.duration_ms::BIGINT,
  CASE WHEN s.error IS NULL THEN 'done' ELSE 'failed' END
FROM structured_runs s;

COMMENT ON VIEW session_stats IS 'Chat, agent, and structured sessions with token usage, under the caller''s RLS.';
COMMENT ON COLUMN session_stats.kind IS 'chat, agent, or structured.';
COMMENT ON COLUMN session_stats.id IS 'Id of the chat, agent run, or structured run.';
COMMENT ON COLUMN session_stats.title IS 'Chat title, agent name, or truncated prompt.';
COMMENT ON COLUMN session_stats.created_at IS 'Session start.';
COMMENT ON COLUMN session_stats.model IS 'Claude model id.';
COMMENT ON COLUMN session_stats.input_tokens IS 'Total input tokens.';
COMMENT ON COLUMN session_stats.output_tokens IS 'Total output tokens.';
COMMENT ON COLUMN session_stats.duration_ms IS 'First-to-last message, run time, or call time.';
COMMENT ON COLUMN session_stats.status IS 'Run status; NULL for chats.';

GRANT SELECT ON session_stats TO authenticated, service_role;
