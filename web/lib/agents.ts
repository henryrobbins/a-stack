/** Tools an agent can be given; mirrors the CHECK on agents.tools. */
export const AGENT_TOOLS = [
  {
    id: 'calculator',
    label: 'Calculator',
    description: 'Evaluate arithmetic.',
  },
  {
    id: 'current_time',
    label: 'Current time',
    description: 'Look up the time in any time zone.',
  },
  {
    id: 'read_file',
    label: 'Read file',
    description: 'Read one of your uploaded text files by id.',
  },
] as const;

export type RunStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';

export function isActive(status: string): boolean {
  return status === 'queued' || status === 'running';
}
