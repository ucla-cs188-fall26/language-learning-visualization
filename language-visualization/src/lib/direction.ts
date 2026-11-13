import type { ClusterWord } from '../../shared/schemas.ts'

export type Direction = 'formal' | 'lessFormal' | 'neutral' | 'emotional'

export const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: 'formal', label: 'formal' },
  { id: 'lessFormal', label: 'casual' },
  { id: 'neutral', label: 'neutral' },
  { id: 'emotional', label: 'emotional' },
]

const isFurther = (from: ClusterWord, to: ClusterWord, direction: Direction) => {
  switch (direction) {
    case 'formal':
      return to.formality < from.formality
    case 'lessFormal':
      return to.formality > from.formality
    case 'neutral':
      return to.emotion < from.emotion
    case 'emotional':
      return to.emotion > from.emotion
  }
}

/** The closest word that lies further in the given direction, if there is one. */
export function nextWord(
  words: ClusterWord[],
  from: ClusterWord,
  direction: Direction,
): ClusterWord | null {
  let best: ClusterWord | null = null
  let bestDistance = Infinity
  for (const word of words) {
    if (word.term === from.term || !isFurther(from, word, direction)) continue
    const distance = Math.hypot(word.formality - from.formality, word.emotion - from.emotion)
    if (distance < bestDistance) {
      best = word
      bestDistance = distance
    }
  }
  return best
}
