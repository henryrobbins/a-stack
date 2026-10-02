import Link from 'next/link';
import { notFound } from 'next/navigation';

import RunPanel from '@/components/agents/RunPanel';
import LabelBar from '@/components/primitives/LabelBar';
import { getRun } from '@/lib/actions/runs';

async function RunPage({ params }: PageProps<'/runs/[id]'>) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) {
    notFound();
  }
  return (
    <>
      <LabelBar>
        <Link href="/agents">Agents</Link> /{' '}
        <Link href={`/agents/${run.agent_id}`}>{run.agents?.name}</Link> / Run
      </LabelBar>
      <RunPanel initialRun={run} />
    </>
  );
}

export default RunPage;
