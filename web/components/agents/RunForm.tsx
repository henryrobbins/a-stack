'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { startRun } from '@/lib/actions/runs';

function RunForm({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      router.push(`/runs/${await startRun(agentId, prompt)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={run} className="grid gap-3 px-pad py-6">
      <Label htmlFor="prompt" className="mono-label">
        Prompt
      </Label>
      <Textarea
        id="prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="What should the agent do?"
      />
      <div>
        <Button type="submit" disabled={pending || !prompt.trim()}>
          {pending ? 'Starting…' : 'Run'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="font-mono text-xs">
          {error}
        </p>
      )}
    </form>
  );
}

export default RunForm;
