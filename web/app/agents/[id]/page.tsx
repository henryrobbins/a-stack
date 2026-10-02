import Link from 'next/link';
import { notFound } from 'next/navigation';

import AgentForm from '@/components/agents/AgentForm';
import RunForm from '@/components/agents/RunForm';
import LabelBar from '@/components/primitives/LabelBar';
import Row from '@/components/primitives/Row';
import { getAgent } from '@/lib/actions/agents';
import { listRuns } from '@/lib/actions/runs';
import { formatDate } from '@/lib/format';

async function AgentPage({ params }: PageProps<'/agents/[id]'>) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) {
    notFound();
  }
  const runs = await listRuns(id);

  return (
    <>
      <LabelBar>
        <Link href="/agents">Agents</Link> / {agent.name}
      </LabelBar>
      <RunForm agentId={agent.id} />
      <LabelBar aside={<span>{runs.length}</span>}>Runs</LabelBar>
      {runs.map((run) => (
        <Row
          key={run.id}
          href={`/runs/${run.id}`}
          title={run.prompt}
          meta={`${run.status} · ${formatDate(run.created_at)}`}
        />
      ))}
      <LabelBar>Settings</LabelBar>
      <AgentForm agent={agent} />
    </>
  );
}

export default AgentPage;
