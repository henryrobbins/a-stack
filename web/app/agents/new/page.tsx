import Link from 'next/link';

import AgentForm from '@/components/agents/AgentForm';
import LabelBar from '@/components/primitives/LabelBar';

function NewAgentPage() {
  return (
    <>
      <LabelBar>
        <Link href="/agents">Agents</Link> / New
      </LabelBar>
      <AgentForm />
    </>
  );
}

export default NewAgentPage;
