'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import ModelSelect from '@/components/forms/ModelSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { runStructured, type StructuredResult } from '@/lib/api';
import { formatDuration } from '@/lib/format';
import { DEFAULT_MODEL } from '@/lib/models';

const EXAMPLE_PROMPT =
  'Ada Lovelace (ada@example.com) wants the Enterprise plan and would like a demo next week.';

const EXAMPLE_SCHEMA = JSON.stringify(
  {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      plan: { type: 'string', enum: ['Free', 'Pro', 'Enterprise'] },
      demo_requested: { type: 'boolean' },
    },
    required: ['name', 'email', 'plan', 'demo_requested'],
    additionalProperties: false,
  },
  null,
  2
);

function StructuredForm() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPT);
  const [schema, setSchema] = useState(EXAMPLE_SCHEMA);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<StructuredResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(schema);
    } catch (err) {
      setError(`Schema is not valid JSON: ${(err as Error).message}`);
      return;
    }
    setRunning(true);
    try {
      setResult(
        await runStructured({ prompt, schema: parsed, model }, await getToken())
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={run} className="grid gap-5 px-pad py-6">
      <div className="grid gap-2">
        <Label htmlFor="prompt" className="mono-label">
          Prompt
        </Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="schema" className="mono-label">
          JSON schema
        </Label>
        <Textarea
          id="schema"
          value={schema}
          onChange={(e) => setSchema(e.target.value)}
          rows={14}
          spellCheck={false}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex items-center gap-3">
        <ModelSelect value={model} onChange={setModel} />
        <Button type="submit" disabled={running || !prompt.trim()}>
          {running ? 'Running…' : 'Run'}
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="border border-line px-4 py-3 font-mono text-xs"
        >
          {error}
        </p>
      )}
      {result && (
        <div className="grid gap-2">
          <div className="mono-label">
            Output · {result.input_tokens} in / {result.output_tokens} out ·{' '}
            {formatDuration(result.duration_ms)}
          </div>
          <pre
            data-testid="structured-output"
            className="overflow-x-auto border border-hair p-4 font-mono text-[13px]"
          >
            {JSON.stringify(result.output, null, 2)}
          </pre>
        </div>
      )}
    </form>
  );
}

export default StructuredForm;
