'use client';

import { useActionState, useState } from 'react';

import ModelSelect from '@/components/forms/ModelSelect';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveAgent } from '@/lib/actions/agents';
import { AGENT_TOOLS } from '@/lib/agents';
import { DEFAULT_MODEL } from '@/lib/models';

interface AgentFormProps {
  agent?: {
    id: string;
    name: string;
    instructions: string;
    model: string;
    tools: string[];
  };
}

function AgentForm({ agent }: AgentFormProps) {
  const [state, action, pending] = useActionState(saveAgent, {});
  const [model, setModel] = useState(agent?.model ?? DEFAULT_MODEL);

  return (
    <form action={action} className="grid gap-5 px-pad py-6">
      {agent && <input type="hidden" name="id" value={agent.id} />}
      <div className="grid gap-2">
        <Label htmlFor="name" className="mono-label">
          Name
        </Label>
        <Input id="name" name="name" defaultValue={agent?.name} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="instructions" className="mono-label">
          Instructions
        </Label>
        <Textarea
          id="instructions"
          name="instructions"
          rows={4}
          defaultValue={agent?.instructions ?? 'You are a helpful assistant.'}
        />
      </div>
      <fieldset className="grid gap-3">
        <legend className="mono-label mb-3">Tools</legend>
        {AGENT_TOOLS.map((tool) => (
          <div key={tool.id} className="flex items-baseline gap-3">
            <Checkbox
              id={`tool-${tool.id}`}
              name="tools"
              value={tool.id}
              defaultChecked={agent?.tools.includes(tool.id)}
            />
            <Label htmlFor={`tool-${tool.id}`} className="font-normal">
              {tool.label}
              <span className="text-muted"> — {tool.description}</span>
            </Label>
          </div>
        ))}
      </fieldset>
      <div className="flex items-center gap-3">
        <ModelSelect value={model} onChange={setModel} name="model" />
        <Button type="submit" disabled={pending}>
          {agent ? 'Save' : 'Create agent'}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="font-mono text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}

export default AgentForm;
