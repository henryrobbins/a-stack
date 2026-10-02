'use client';

import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';

import Composer from '@/components/chat/Composer';
import ModelSelect from '@/components/forms/ModelSelect';
import { createChat } from '@/lib/actions/chats';
import { streamChatMessage } from '@/lib/api';
import { DEFAULT_MODEL } from '@/lib/models';
import type { UploadedFile } from '@/lib/upload';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files: UploadedFile[];
}

interface ChatThreadProps {
  /** Omitted for a new chat, which is created on the first send. */
  chatId?: string;
  initialMessages: ChatMessage[];
}

function ChatThread({
  chatId: initialChatId,
  initialMessages,
}: ChatThreadProps) {
  const { getToken } = useAuth();
  const [chatId, setChatId] = useState(initialChatId);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [messages, setMessages] = useState(initialMessages);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(content: string, files: UploadedFile[]) {
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content, files },
    ]);
    setReply('');
    let text = '';
    try {
      let id = chatId;
      if (!id) {
        id = await createChat(content, model);
        setChatId(id);
        window.history.replaceState(null, '', `/chat/${id}`);
      }
      await streamChatMessage(
        id,
        { content, file_ids: files.map((f) => f.id) },
        await getToken(),
        (delta) => {
          text += delta;
          setReply(text);
        }
      );
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          files: [],
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReply(null);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <ol className="flex-1">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {reply !== null && (
          <Message
            message={{
              id: 'pending',
              role: 'assistant',
              content: reply || '…',
              files: [],
            }}
          />
        )}
      </ol>
      {error && (
        <p
          role="alert"
          className="border-hair border-t px-pad py-3 font-mono text-xs"
        >
          Error: {error}
        </p>
      )}
      <Composer
        disabled={reply !== null}
        onSend={send}
        extra={
          chatId ? null : <ModelSelect value={model} onChange={setModel} />
        }
      />
    </div>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const { role, content, files } = message;
  return (
    <li className="border-hair border-b px-pad py-5">
      <div className="mono-label mb-2">
        {role === 'user' ? 'You' : 'Claude'}
      </div>
      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2 font-mono text-xs text-muted">
          {files.map((file) => (
            <li key={file.id} className="border border-hair px-2 py-1">
              {file.name}
            </li>
          ))}
        </ul>
      )}
      <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
    </li>
  );
}

export default ChatThread;
