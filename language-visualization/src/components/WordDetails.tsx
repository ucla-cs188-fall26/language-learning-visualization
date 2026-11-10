import type { ClusterWord, ContextId } from '../../shared/schemas.ts'
import { contextLabel } from '../lib/contexts.ts'
import { Term } from './common.tsx'
import { MoreControls } from './MoreControls.tsx'

const FIT_TITLE = { good: 'Good fit', okay: 'Okay fit', poor: 'Poor fit' }

interface Props {
  word: ClusterWord
  words: ClusterWord[]
  context: ContextId | null
  isSelected: boolean
  canSelect: boolean
  isSaved: boolean
  onMove: (term: string) => void
  onToggleSelect: () => void
  onToggleSave: () => void
}

export function WordDetails(props: Props) {
  const { word, words, context, isSelected, canSelect, isSaved } = props
  const fit = context ? word.fit[context] : null

  return (
    <aside className="details" aria-live="polite">
      <p className="details-term"><Term>{word.term}</Term></p>
      {word.romanization && <p className="details-romanization">{word.romanization}</p>}
      <p className="details-gloss">{word.gloss}</p>
      <p>{word.nuance}</p>
      <p className="muted">{word.positionReason}</p>
      {context && fit && (
        <p className={`fit-note fit-note-${fit.rating}`}>
          <strong>{FIT_TITLE[fit.rating]} for {contextLabel(context).toLowerCase()}.</strong> {fit.reason}
        </p>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button"
          disabled={!isSelected && !canSelect}
          onClick={props.onToggleSelect}
        >
          {isSelected ? 'Remove from compare' : 'Add to compare'}
        </button>
        <button type="button" className="button" aria-pressed={isSaved} onClick={props.onToggleSave}>
          {isSaved ? 'Saved ✓' : 'Save to my map'}
        </button>
      </div>
      {!isSelected && !canSelect && <p className="muted">You can compare up to 3 words at once.</p>}
      <MoreControls words={words} from={word} onMove={props.onMove} />
    </aside>
  )
}
