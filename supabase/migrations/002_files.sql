-- Migration 002: Uploaded files and the uploads storage bucket
--
-- Browsers upload straight to Supabase Storage with their Clerk token (which
-- sidesteps Vercel's request body limit), then record the object in `files`.
-- Object paths are `{clerk_sub}/{uuid}-{filename}`, so storage policies can
-- scope access by the first path segment without a join.
--
-- The bucket is created here rather than in config.toml so that it exists in
-- production after `supabase db push`, not only locally.

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT current_app_user_id()
    REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  storage_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE files IS 'A file a user uploaded to the uploads storage bucket.';
COMMENT ON COLUMN files.id IS 'File id; referenced by chat messages and the read_file agent tool.';
COMMENT ON COLUMN files.user_id IS 'Owner; defaults to the calling user.';
COMMENT ON COLUMN files.name IS 'Original filename as uploaded.';
COMMENT ON COLUMN files.content_type IS 'MIME type, one of the bucket''s allowed types.';
COMMENT ON COLUMN files.size_bytes IS 'Size in bytes.';
COMMENT ON COLUMN files.storage_path IS 'Object path in the uploads bucket: {clerk_sub}/{uuid}-{filename}.';
COMMENT ON COLUMN files.created_at IS 'Upload time.';

CREATE INDEX files_user_id_idx ON files (user_id);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE files FORCE ROW LEVEL SECURITY;

CREATE POLICY "owners read files"
  ON files FOR SELECT TO authenticated
  USING ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners insert files"
  ON files FOR INSERT TO authenticated
  WITH CHECK ((SELECT current_app_user_id()) = user_id);

CREATE POLICY "owners delete files"
  ON files FOR DELETE TO authenticated
  USING ((SELECT current_app_user_id()) = user_id);

GRANT SELECT, INSERT, DELETE ON files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON files TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  52428800, -- 50 MiB
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json'
  ]
);

CREATE POLICY "owners read uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
  );

CREATE POLICY "owners insert uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
  );

CREATE POLICY "owners delete uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
  );
