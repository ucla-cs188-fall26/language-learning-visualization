import { useMemo, useState } from 'react'
import { useLanguage } from '../lib/languageContext.ts'
import { groupBySense, layoutPersonalMap } from '../lib/layout.ts'
import type { SavedWord } from '../lib/savedWords.ts'
import { useElementWidth } from '../lib/useElementWidth.ts'
import { Term } from './common.tsx'

const BUBBLE_COLORS = 6

interface Props {
  words: SavedWord[]
  onRemove: (term: string) => void
}

export function PersonalMap({ words, onRemove }: Props) {
  const { name } = useLanguage()
  const [graphRef, width] = useElementWidth<HTMLDivElement>()
  const [focused, setFocused] = useState<string | null>(null)

  const groups = useMemo(() => groupBySense(words), [words])
  const height = Math.max(440, 200 + (words.length + groups.length) * 30)
  const layout = useMemo(
    () => (width > 0 ? layoutPersonalMap(words, groups, width, height) : null),
    [words, groups, width, height],
  )
  const focusedWord = words.find((word) => word.term === focused)

  if (words.length === 0) {
    return (
      <section>
        <h2>My {name} map</h2>
        <p className="notice">
          No {name} words saved yet. Save words as you explore, and they'll connect here over time.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2>My {name} map</h2>
      <p className="muted">
        Words group around the English meaning you found them from. A word saved from two searches
        connects both groups.
      </p>
      <div className="map-layout">
        <div className="graph" ref={graphRef} style={{ height }}>
          {layout && (
            <>
              <svg width={width} height={height} aria-hidden="true">
                {layout.bubbles.map((bubble, index) => (
                  <circle
                    key={bubble.key}
                    className={`bubble bubble-${index % BUBBLE_COLORS}`}
                    cx={bubble.x}
                    cy={bubble.y}
                    r={bubble.radius}
                  />
                ))}
                {layout.links.map((link) => (
                  <line key={link.key} x1={link.from.x} y1={link.from.y} x2={link.to.x} y2={link.to.y} />
                ))}
              </svg>
              {groups.map((group) => {
                const position = layout.hubs.get(group.key)!
                return (
                  <span key={group.key} className="hub" style={{ left: position.x, top: position.y }}>
                    <span aria-hidden="true">{group.emoji}</span> {group.word}
                    <small>{group.senseLabel}</small>
                  </span>
                )
              })}
              {words.map((word) => {
                const position = layout.words.get(word.term)!
                return (
                  <button
                    key={word.term}
                    type="button"
                    className="word-node"
                    style={{ left: position.x, top: position.y }}
                    aria-pressed={focused === word.term}
                    aria-label={`${word.term}, ${word.gloss}`}
                    onClick={() => setFocused(word.term)}
                  >
                    <span className="word-term"><Term>{word.term}</Term></span>
                    {word.romanization && <span className="word-romanization">{word.romanization}</span>}
                  </button>
                )
              })}
            </>
          )}
        </div>
        {focusedWord ? (
          <aside className="details" aria-live="polite">
            <p className="details-term"><Term>{focusedWord.term}</Term></p>
            {focusedWord.romanization && <p className="details-romanization">{focusedWord.romanization}</p>}
            <p className="details-gloss">{focusedWord.gloss}</p>
            <p>{focusedWord.nuance}</p>
            <p className="muted">
              Saved from:{' '}
              {focusedWord.sources.map((source) => `${source.word} (${source.senseLabel})`).join(', ')}
            </p>
            <button
              type="button"
              className="button"
              onClick={() => {
                onRemove(focusedWord.term)
                setFocused(null)
              }}
            >
              Remove from my map
            </button>
          </aside>
        ) : (
          <aside className="details details-empty">
            <p>Select a word to review it.</p>
          </aside>
        )}
      </div>
    </section>
  )
}
