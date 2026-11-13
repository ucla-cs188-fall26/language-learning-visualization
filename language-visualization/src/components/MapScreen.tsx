import type { ClusterWord, ContextId, Sense } from '../../shared/schemas.ts'
import { CONTEXTS } from '../lib/contexts.ts'
import { AiNote, Term } from './common.tsx'
import { WordDetails } from './WordDetails.tsx'
import { WordMap } from './WordMap.tsx'

interface Props {
  word: string
  sense: Sense
  words: ClusterWord[]
  context: ContextId | null
  focused: string | null
  selected: string[]
  isSaved: (term: string) => boolean
  onContext: (context: ContextId | null) => void
  onFocus: (term: string) => void
  onToggleSelect: (term: string) => void
  onToggleSave: (word: ClusterWord) => void
  onCompare: () => void
}

export function MapScreen(props: Props) {
  const { word, sense, words, context, focused, selected } = props
  const focusedWord = words.find((entry) => entry.term === focused)

  return (
    <section>
      <h2>
        <span aria-hidden="true">{sense.emoji}</span> “{word}” as in {sense.label}
      </h2>

      <div className="chip-row" role="group" aria-label="Situation">
        {CONTEXTS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={context === id}
            onClick={() => props.onContext(context === id ? null : id)}
          >
            {label}
          </button>
        ))}
      </div>
      {context && (
        <p className="legend muted">
          <span>✓ good fit</span> <span>no mark: okay</span> <span>– and faded: poor fit</span>
        </p>
      )}

      <div className="map-layout">
        <WordMap
          words={words}
          context={context}
          focused={focused}
          selected={selected}
          onFocus={props.onFocus}
        />
        {focusedWord ? (
          <WordDetails
            key={focusedWord.term}
            word={focusedWord}
            words={words}
            context={context}
            isSelected={selected.includes(focusedWord.term)}
            canSelect={selected.length < 3}
            isSaved={props.isSaved(focusedWord.term)}
            onMove={props.onFocus}
            onToggleSelect={() => props.onToggleSelect(focusedWord.term)}
            onToggleSave={() => props.onToggleSave(focusedWord)}
          />
        ) : (
          <aside className="details details-empty">
            <p>Select a word to see how it differs from the others.</p>
          </aside>
        )}
      </div>

      <div className="compare-bar">
        <p>
          {selected.length === 0 ? (
            'Add 2 or 3 words to compare them.'
          ) : (
            <>Comparing: <Term>{selected.join(', ')}</Term></>
          )}
        </p>
        <button
          type="button"
          className="button button-primary"
          disabled={selected.length < 2}
          onClick={props.onCompare}
        >
          Compare
        </button>
      </div>
      <AiNote />
    </section>
  )
}
