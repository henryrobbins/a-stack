import Link from 'next/link';
import { notFound } from 'next/navigation';

import ChatThread, { type ChatMessage } from '@/components/chat/ChatThread';
import LabelBar from '@/components/primitives/LabelBar';
import { createClient } from '@/lib/supabase/server';

async function ChatPage({ params }: PageProps<'/chat/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: chat } = await supabase
    .from('chats')
    .select('id, title, model')
    .eq('id', id)
    .maybeSingle();
  if (!chat) {
    notFound();
  }
  const { data: rows } = await supabase
    .from('chat_messages')
    .select('id, role, content, file_ids')
    .eq('chat_id', id)
    .order('created_at');
  const fileIds = (rows ?? []).flatMap((m) => m.file_ids);
  const { data: files } = fileIds.length
    ? await supabase.from('files').select('id, name').in('id', fileIds)
    : { data: [] };
  const names = new Map((files ?? []).map((f) => [f.id, f.name]));

  const messages: ChatMessage[] = (rows ?? []).map((m) => ({
    id: m.id,
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
    files: m.file_ids.map((fid) => ({
      id: fid,
      name: names.get(fid) ?? 'file',
    })),
  }));

  return (
    <>
      <LabelBar aside={<span>{chat.model}</span>}>
        <Link href="/chat">Chats</Link> / {chat.title}
      </LabelBar>
      <ChatThread chatId={chat.id} initialMessages={messages} />
    </>
  );
}

export default ChatPage;
