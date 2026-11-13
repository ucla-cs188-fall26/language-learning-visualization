import type { Sense } from '../../shared/schemas.ts'

interface Props {
  word: string
  senses: Sense[]
  onPick: (sense: Sense) => void
}

export function SenseChips({ word, senses, onPick }: Props) {
  if (senses.length === 0) {
    return (
      <p className="notice" role="status">
        We couldn't find “{word}” as an English word. Check the spelling or try another word.
      </p>
    )
  }

  return (
    <section>
      <h2>Which “{word}” do you mean?</h2>
      <div className="sense-grid">
        {senses.map((sense) => (
          <button key={sense.id} type="button" className="sense-chip" onClick={() => onPick(sense)}>
            <span className="sense-title">
              <span aria-hidden="true">{sense.emoji}</span> {sense.label}
            </span>
            <span className="sense-example">{sense.example}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
