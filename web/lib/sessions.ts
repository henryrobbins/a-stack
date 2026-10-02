export const SESSION_KINDS = ['chat', 'agent', 'structured'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export function isSessionKind(value: unknown): value is SessionKind {
  return SESSION_KINDS.includes(value as SessionKind);
}
