import ChatThread from '@/components/chat/ChatThread';
import LabelBar from '@/components/primitives/LabelBar';
import Row from '@/components/primitives/Row';
import { listChats } from '@/lib/actions/chats';
import { formatDate } from '@/lib/format';

async function ChatIndexPage() {
  const chats = await listChats();
  return (
    <>
      <LabelBar>New chat</LabelBar>
      <ChatThread initialMessages={[]} />
      <LabelBar aside={<span>{chats.length}</span>}>Chats</LabelBar>
      {chats.map((chat) => (
        <Row
          key={chat.id}
          href={`/chat/${chat.id}`}
          title={chat.title}
          meta={formatDate(chat.created_at)}
        />
      ))}
    </>
  );
}

export default ChatIndexPage;
