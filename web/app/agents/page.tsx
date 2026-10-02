import Link from 'next/link';

import { Cell, CellGrid } from '@/components/primitives/CellGrid';
import LabelBar from '@/components/primitives/LabelBar';
import { listAgents } from '@/lib/actions/agents';
import { MODELS } from '@/lib/models';

async function AgentsPage() {
  const agents = await listAgents();
  return (
    <>
      <LabelBar aside={<Link href="/agents/new">New agent +</Link>}>
        Agents
      </LabelBar>
      {agents.length === 0 ? (
        <p className="px-pad py-6 text-muted">
          No agents yet. <Link href="/agents/new">Create one</Link>.
        </p>
      ) : (
        <CellGrid>
          {agents.map((agent) => (
            <Cell
              key={agent.id}
              href={`/agents/${agent.id}`}
              kicker={MODELS.find((m) => m.id === agent.model)?.label}
              title={agent.name}
            >
              {agent.tools.length ? agent.tools.join(', ') : 'No tools'}
            </Cell>
          ))}
        </CellGrid>
      )}
    </>
  );
}

export default AgentsPage;
