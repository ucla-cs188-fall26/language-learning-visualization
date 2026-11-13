import { useState } from 'react'
import type { ClusterWord } from '../../shared/schemas.ts'
import { DIRECTIONS, nextWord } from '../lib/direction.ts'
import type { Direction } from '../lib/direction.ts'

interface Props {
  words: ClusterWord[]
  from: ClusterWord
  onMove: (term: string) => void
}

export function MoreControls({ words, from, onMove }: Props) {
  const [notice, setNotice] = useState<string | null>(null)

  function move(direction: Direction, label: string) {
    const next = nextWord(words, from, direction)
    if (next) onMove(next.term)
    else setNotice(`No word here is more ${label} than this one.`)
  }

  return (
    <div className="more">
      <p className="more-label" id="more-label">I want something more...</p>
      <div className="chip-row" role="group" aria-labelledby="more-label">
        {DIRECTIONS.map(({ id, label }) => (
          <button key={id} type="button" className="chip" onClick={() => move(id, label)}>
            {label}
          </button>
        ))}
      </div>
      {notice && <p className="muted" role="status">{notice}</p>}
    </div>
  )
}
