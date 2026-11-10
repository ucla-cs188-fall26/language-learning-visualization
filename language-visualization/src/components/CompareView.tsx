import type { ClusterWord, CompareResponse, ContextId, TermPhrase } from '../../shared/schemas.ts'
import { contextLabel } from '../lib/contexts.ts'
import { AiNote, Term } from './common.tsx'

function Phrase({ phrase }: { phrase: TermPhrase }) {
  return (
    <li>
      <span className="phrase-term"><Term>{phrase.term}</Term></span>
      {phrase.romanization && <span className="phrase-romanization">{phrase.romanization}</span>}
      <span className="muted">{phrase.english}</span>
    </li>
  )
}

interface Props {
  comparison: CompareResponse
  words: ClusterWord[]
  context: ContextId | null
  isSaved: (term: string) => boolean
  onToggleSave: (word: ClusterWord) => void
}

export function CompareView({ comparison, words, context, isSaved, onToggleSave }: Props) {
  return (
    <section>
      <p className="summary">{comparison.summary}</p>
      {context && <p className="muted">Advice for: {contextLabel(context).toLowerCase()}</p>}
      <div className="compare-grid">
        {comparison.words.map((entry) => {
          const word = words.find((candidate) => candidate.term === entry.term)
          return (
            <article key={entry.term} className="compare-card">
              <h3 className="details-term"><Term>{entry.term}</Term></h3>
              {word?.romanization && <p className="details-romanization">{word.romanization}</p>}
              {word && <p className="details-gloss">{word.gloss}</p>}
              <p className="use-when">{entry.useWhen}</p>
              <h4>Examples</h4>
              <ul className="phrase-list">
                {entry.examples.map((phrase) => <Phrase key={phrase.term} phrase={phrase} />)}
              </ul>
              <h4>Common pairings</h4>
              <ul className="phrase-list">
                {entry.collocations.map((phrase) => <Phrase key={phrase.term} phrase={phrase} />)}
              </ul>
              {word && (
                <button
                  type="button"
                  className="button"
                  aria-pressed={isSaved(word.term)}
                  onClick={() => onToggleSave(word)}
                >
                  {isSaved(word.term) ? 'Saved ✓' : 'Save to my map'}
                </button>
              )}
            </article>
          )
        })}
      </div>
      <AiNote />
    </section>
  )
}
