import type { ContextId } from '../../shared/schemas.ts'
import { CONTEXTS } from '../lib/contexts.ts'

export function ContextPrompt({ onChoose }: { onChoose: (context: ContextId | null) => void }) {
  return (
    <section>
      <h2>Who are you talking to, or what's the setting?</h2>
      <p className="muted">We'll highlight the words that fit. You can change this later.</p>
      <div className="chip-row">
        {CONTEXTS.map((context) => (
          <button key={context.id} type="button" className="chip" onClick={() => onChoose(context.id)}>
            {context.label}
          </button>
        ))}
        <button type="button" className="button button-quiet" onClick={() => onChoose(null)}>
          Skip
        </button>
      </div>
    </section>
  )
}
