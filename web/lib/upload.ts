import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

/** Mirrors the uploads bucket's limits (supabase/migrations/002_files.sql). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
];

export interface UploadedFile {
  id: string;
  name: string;
}

// Browsers report an empty type for some text files (often .md).
function contentType(file: File): string {
  if (file.type) {
    return file.type;
  }
  return file.name.endsWith('.md') ? 'text/markdown' : 'text/plain';
}

/**
 * Upload a file straight to Storage as the signed-in user, then record it in
 * `files`. Throws with a readable message when the file is too large or of a
 * type the bucket refuses.
 */
export async function uploadFile(
  supabase: SupabaseClient<Database>,
  clerkUserId: string,
  file: File
): Promise<UploadedFile> {
  const type = contentType(file);
  if (!ALLOWED_TYPES.includes(type)) {
    throw new Error(`${file.name}: unsupported file type`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name}: larger than 50 MB`);
  }
  const path = `${clerkUserId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(path, file, { contentType: type });
  if (uploadError) {
    throw new Error(`${file.name}: ${uploadError.message}`);
  }
  const { data, error } = await supabase
    .from('files')
    .insert({
      name: file.name,
      content_type: type,
      size_bytes: file.size,
      storage_path: path,
    })
    .select('id, name')
    .single();
  if (error) {
    await supabase.storage.from('uploads').remove([path]);
    throw new Error(`${file.name}: ${error.message}`);
  }
  return data;
}
