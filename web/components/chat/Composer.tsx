'use client';

import { useUser } from '@clerk/nextjs';
import { Paperclip, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseClient } from '@/lib/supabase/client';
import { ALLOWED_TYPES, type UploadedFile, uploadFile } from '@/lib/upload';

interface ComposerProps {
  disabled: boolean;
  onSend: (content: string, files: UploadedFile[]) => void;
  /** Rendered beside the send button, e.g. a model picker. */
  extra?: React.ReactNode;
}

function Composer({ disabled, onSend, extra }: ComposerProps) {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function attach(list: FileList | null) {
    if (!list || !user) {
      return;
    }
    setUploadError(null);
    for (const file of Array.from(list)) {
      setUploading((n) => n + 1);
      try {
        const uploaded = await uploadFile(supabase, user.id, file);
        setFiles((prev) => [...prev, uploaded]);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function send() {
    const text = content.trim();
    if (!text || disabled || uploading > 0) {
      return;
    }
    onSend(text, files);
    setContent('');
    setFiles([]);
  }

  return (
    <div className="border-line border-t px-pad py-4">
      {(files.length > 0 || uploading > 0) && (
        <ul className="mb-3 flex flex-wrap gap-2 font-mono text-xs">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-1 border border-hair px-2 py-1"
            >
              {file.name}
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  setFiles((prev) => prev.filter((f) => f.id !== file.id))
                }
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
          {uploading > 0 && (
            <li className="px-2 py-1 text-muted">Uploading…</li>
          )}
        </ul>
      )}
      {uploadError && (
        <p role="alert" className="mb-3 font-mono text-xs">
          {uploadError}
        </p>
      )}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Message Claude…"
        aria-label="Message"
        rows={3}
        className="resize-none"
      />
      <div className="mt-3 flex items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept={ALLOWED_TYPES.join(',')}
          onChange={(e) => {
            attach(e.target.files);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInput.current?.click()}
        >
          <Paperclip /> Attach
        </Button>
        <div className="flex-1" />
        {extra}
        <Button
          type="button"
          onClick={send}
          disabled={disabled || uploading > 0 || !content.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

export default Composer;
