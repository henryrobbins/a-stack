/** Claude models offered in the chat, agent, and structured-output forms. */
export const MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
] as const;

export type ModelId = (typeof MODELS)[number]['id'];

export const DEFAULT_MODEL: ModelId = MODELS[0].id;

export function isModel(id: string): id is ModelId {
  return MODELS.some((model) => model.id === id);
}
