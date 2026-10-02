-- Migration 003: Chats and chat messages
--
-- The web app creates chats; the API writes both sides of each exchange with
-- the caller's token, so every write here is subject to RLS. Message inserts
-- also require the parent chat to be visible to the caller, which stops a
-- user from appending to someone else's chat under their own user_id.

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT current_app_user_id()
    REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE chats IS 'A chat session with Claude.';
COMMENT ON COLUMN chats.id IS 'Chat id.';
COMMENT ON COLUMN chats.user_id IS 'Owner; defaults to the calling user.';
COMMENT ON COLUMN chats.title IS 'The first user message, truncated.';
COMMENT ON COLUMN chats.model IS 'Claude model id used for replies.';
COMMENT ON COLUMN chats.created_at IS 'Creation time.';

CREATE INDEX chats_user_id_created_at_idx ON chats (user_id, created_at DESC);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT current_app_user_id()
    REFERENCES users (id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  file_ids UUID[] NOT NULL DEFAULT '{}',
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE chat_messages IS 'One turn of a chat.';
COMMENT ON COLUMN chat_messages.id IS 'Message id.';
COMMENT ON COLUMN chat_messages.user_id IS 'Owner; defaults to the calling user.';
COMMENT ON COLUMN chat_messages.chat_id IS 'Parent chat.';
COMMENT ON COLUMN chat_messages.role IS 'user or assistant.';
COMMENT ON COLUMN chat_messages.content IS 'Message text.';
COMMENT ON COLUMN chat_messages.file_ids IS 'files.id values attached to a user message.';
COMMENT ON COLUMN chat_messages.input_tokens IS 'Input tokens billed for an assistant reply.';
COMMENT ON COLUMN chat_messages.output_tokens IS 'Output tokens billed for an assistant reply.';
COMMENT ON COLUMN chat_messages.created_at IS 'Creation time; orders the thread.';

CREATE INDEX chat_messages_chat_id_created_at_idx ON chat_messages (chat_id, created_at);
CREATE INDEX chat_messages_user_id_idx ON chat_messages (user_id);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats FORCE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY "owners read chats"
  ON chats FOR SELECT TO authenticated
  USING ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners insert chats"
  ON chats FOR INSERT TO authenticated
  WITH CHECK ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners delete chats"
  ON chats FOR DELETE TO authenticated
  USING ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners read chat messages"
  ON chat_messages FOR SELECT TO authenticated
  USING ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners insert chat messages"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT current_app_user_id()) = user_id
    AND chat_id IN (SELECT id FROM chats)
  );

GRANT SELECT, INSERT, DELETE ON chats TO authenticated;
GRANT SELECT, INSERT ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chats, chat_messages TO service_role;
