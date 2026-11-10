import { useMemo } from 'react'
import type { ClusterWord, ContextId } from '../../shared/schemas.ts'
import { layoutQuadrant } from '../lib/layout.ts'
import { useElementWidth } from '../lib/useElementWidth.ts'
import { Term } from './common.tsx'

const HEIGHT = 460

const FIT_MARK = { good: '✓', okay: '', poor: '–' }
const FIT_TEXT = { good: 'good fit', okay: 'okay fit', poor: 'poor fit' }

interface Props {
  words: ClusterWord[]
  context: ContextId | null
  focused: string | null
  selected: string[]
  onFocus: (term: string) => void
}

export function WordMap({ words, context, focused, selected, onFocus }: Props) {
  const [plotRef, width] = useElementWidth<HTMLDivElement>()
  const positions = useMemo(
    () => (width > 0 ? layoutQuadrant(words, width, HEIGHT) : null),
    [words, width],
  )

  return (
    <figure className="quadrant" aria-label="Words placed by formality and emotion">
      <span className="axis-label axis-top">Emotional ↑</span>
      <div className="plot" ref={plotRef} style={{ height: HEIGHT }}>
        <svg width={width} height={HEIGHT} aria-hidden="true">
          <line x1={width / 2} y1={0} x2={width / 2} y2={HEIGHT} />
          <line x1={0} y1={HEIGHT / 2} x2={width} y2={HEIGHT / 2} />
        </svg>
        {positions &&
          words.map((word) => {
            const position = positions.get(word.term)!
            const fit = context ? word.fit[context].rating : null
            const isSelected = selected.includes(word.term)
            const classes = ['word-node', fit ? `fit-${fit}` : '', isSelected ? 'is-selected' : '']
            return (
              <button
                key={word.term}
                type="button"
                className={classes.join(' ')}
                style={{ left: position.x, top: position.y }}
                aria-pressed={focused === word.term}
                aria-label={`${word.term}, ${word.gloss}${fit ? `, ${FIT_TEXT[fit]}` : ''}${isSelected ? ', added to compare' : ''}`}
                onClick={() => onFocus(word.term)}
              >
                <span className="word-term">
                  <Term>{word.term}</Term>
                  {fit && FIT_MARK[fit] && <span className="fit-mark"> {FIT_MARK[fit]}</span>}
                </span>
                {word.romanization && <span className="word-romanization">{word.romanization}</span>}
              </button>
            )
          })}
      </div>
      <div className="axis-row">
        <span className="axis-label">← More formal</span>
        <span className="axis-label">Neutral ↓</span>
        <span className="axis-label">Less formal →</span>
      </div>
    </figure>
  )
}
