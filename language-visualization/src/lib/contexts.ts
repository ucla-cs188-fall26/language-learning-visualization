import type { ContextId } from '../../shared/schemas.ts'

export const CONTEXTS: { id: ContextId; label: string }[] = [
  { id: 'friend', label: 'Friend' },
  { id: 'boss', label: 'Boss' },
  { id: 'stranger', label: 'Stranger' },
  { id: 'writing', label: 'Writing' },
  { id: 'text', label: 'Text message' },
]

export const contextLabel = (id: ContextId) =>
  CONTEXTS.find((context) => context.id === id)?.label ?? id
