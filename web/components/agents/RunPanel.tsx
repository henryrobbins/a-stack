'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cancelRun, getRun } from '@/lib/actions/runs';
import { isActive } from '@/lib/agents';
import { formatNumber } from '@/lib/format';

const POLL_MS = 2000;

type Run = NonNullable<Awaited<ReturnType<typeof getRun>>>;

interface ActivityEvent {
  kind: string;
  text: string;
}

function RunPanel({ initialRun }: { initialRun: Run }) {
  const [run, setRun] = useState(initialRun);
  const active = isActive(run.status);

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setInterval(async () => {
      const next = await getRun(run.id);
      if (next) {
        setRun(next);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [active, run.id]);

  async function cancel() {
    await cancelRun(run.id);
    setRun((prev) => ({ ...prev, cancel_requested: true }));
  }

  const activity = (run.activity ?? []) as unknown as ActivityEvent[];

  return (
    <div className="grid gap-6 px-pad py-6">
      <div className="flex items-baseline gap-4">
        <span className="mono-label" data-testid="run-status">
          {run.status}
          {active && run.cancel_requested && ' · canceling'}
        </span>
        <span className="flex-1" />
        {active && (
          <Button
            variant="outline"
            size="sm"
            onClick={cancel}
            disabled={run.cancel_requested}
          >
            Cancel
          </Button>
        )}
      </div>
      <p className="whitespace-pre-wrap">{run.prompt}</p>
      {activity.length > 0 && (
        <ol className="grid gap-1 border-hair border-l pl-4 font-mono text-xs">
          {activity.map((event, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only feed
            <li key={i} className={event.kind === 'text' ? '' : 'text-muted'}>
              <span className="mr-2 uppercase">{event.kind}</span>
              {event.text}
            </li>
          ))}
        </ol>
      )}
      {run.result && (
        <div className="grid gap-2">
          <div className="mono-label">Result</div>
          <div className="whitespace-pre-wrap" data-testid="run-result">
            {run.result}
          </div>
        </div>
      )}
      {run.error && (
        <p
          role="alert"
          className="border border-line px-4 py-3 font-mono text-xs"
        >
          {run.error}
        </p>
      )}
      {!active && (
        <div className="font-mono text-muted text-xs">
          {formatNumber(run.input_tokens)} in ·{' '}
          {formatNumber(run.output_tokens)} out
          {run.cost_usd !== null && ` · $${Number(run.cost_usd).toFixed(4)}`}
        </div>
      )}
    </div>
  );
}

export default RunPanel;
