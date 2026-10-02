import Link from 'next/link';

import DataTable, { type Column } from '@/components/primitives/DataTable';
import LabelBar from '@/components/primitives/LabelBar';
import { listSessionStats } from '@/lib/actions/stats';
import { formatDate, formatDuration, formatNumber } from '@/lib/format';
import { isSessionKind, SESSION_KINDS } from '@/lib/sessions';

type Session = Awaited<ReturnType<typeof listSessionStats>>[number];

const HREF: Record<string, (id: string) => string> = {
  chat: (id) => `/chat/${id}`,
  agent: (id) => `/runs/${id}`,
};

const COLUMNS: Column<Session>[] = [
  {
    header: 'Kind',
    cell: (s) => <span className="font-mono text-xs">{s.kind}</span>,
  },
  {
    header: 'Title',
    cell: (s) => {
      const href = s.kind && s.id ? HREF[s.kind]?.(s.id) : undefined;
      return href ? (
        <Link href={href} className="border-link border-b">
          {s.title}
        </Link>
      ) : (
        s.title
      );
    },
  },
  {
    header: 'Date',
    cell: (s) => (s.created_at ? formatDate(s.created_at) : '—'),
  },
  {
    header: 'Model',
    cell: (s) => <span className="font-mono text-xs">{s.model}</span>,
  },
  { header: 'In', numeric: true, cell: (s) => formatNumber(s.input_tokens) },
  { header: 'Out', numeric: true, cell: (s) => formatNumber(s.output_tokens) },
  {
    header: 'Duration',
    numeric: true,
    cell: (s) => formatDuration(s.duration_ms),
  },
  { header: 'Status', cell: (s) => s.status ?? '—' },
];

async function StatsPage({ searchParams }: PageProps<'/stats'>) {
  const { kind } = await searchParams;
  const filter = isSessionKind(kind) ? kind : undefined;
  const sessions = await listSessionStats(filter);

  return (
    <>
      <LabelBar
        aside={
          <nav className="flex gap-4 normal-case tracking-normal">
            {[undefined, ...SESSION_KINDS].map((k) => (
              <Link
                key={k ?? 'all'}
                href={k ? `/stats?kind=${k}` : '/stats'}
                aria-current={k === filter ? 'page' : undefined}
                className={k === filter ? 'text-ink underline' : undefined}
              >
                {k ?? 'all'}
              </Link>
            ))}
          </nav>
        }
      >
        Sessions
      </LabelBar>
      <DataTable
        columns={COLUMNS}
        rows={sessions}
        rowKey={(s) => `${s.kind}-${s.id}`}
        empty="No sessions yet."
      />
    </>
  );
}

export default StatsPage;
