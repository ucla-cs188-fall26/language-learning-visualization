import type { LanguageId } from '../../shared/languages.ts'

export interface SavedSource {
  word: string
  senseLabel: string
  emoji: string
}

export interface SavedWord {
  language: LanguageId
  term: string
  romanization: string
  gloss: string
  nuance: string
  sources: SavedSource[]
}

const STORAGE_KEY = 'word-map:saved'
const VERSION = 2

interface SavedWordV1 {
  hanzi: string
  pinyin: string
  gloss: string
  nuance: string
  sources: SavedSource[]
}

const fromV1 = ({ hanzi, pinyin, ...rest }: SavedWordV1): SavedWord => ({
  ...rest,
  language: 'mandarin',
  term: hanzi,
  romanization: pinyin,
})

export function loadSaved(): SavedWord[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
      version?: number
      words?: unknown[]
    } | null
    if (!Array.isArray(stored?.words)) return []
    if (stored.version === 1) return (stored.words as SavedWordV1[]).map(fromV1)
    return stored.version === VERSION ? (stored.words as SavedWord[]) : []
  } catch {
    return []
  }
}

/** Returns false when the browser couldn't store the data. */
export function persistSaved(words: SavedWord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, words }))
    return true
  } catch {
    return false
  }
}

const sameSource = (a: SavedSource, b: SavedSource) =>
  a.word === b.word && a.senseLabel === b.senseLabel

const matches = (word: SavedWord, language: LanguageId, term: string) =>
  word.language === language && word.term === term

export const isSavedFrom = (
  words: SavedWord[],
  language: LanguageId,
  term: string,
  source: SavedSource,
) =>
  words.some(
    (word) => matches(word, language, term) && word.sources.some((saved) => sameSource(saved, source)),
  )

/** Saving a word again from another search adds a source to the same entry. */
export function addSaved(
  words: SavedWord[],
  entry: Omit<SavedWord, 'sources'>,
  source: SavedSource,
): SavedWord[] {
  const existing = words.find((word) => matches(word, entry.language, entry.term))
  if (!existing) return [...words, { ...entry, sources: [source] }]
  if (existing.sources.some((saved) => sameSource(saved, source))) return words
  return words.map((word) =>
    word === existing ? { ...word, sources: [...word.sources, source] } : word,
  )
}

export function removeSource(
  words: SavedWord[],
  language: LanguageId,
  term: string,
  source: SavedSource,
): SavedWord[] {
  return words
    .map((word) =>
      matches(word, language, term)
        ? { ...word, sources: word.sources.filter((saved) => !sameSource(saved, source)) }
        : word,
    )
    .filter((word) => word.sources.length > 0)
}

export const removeSaved = (words: SavedWord[], language: LanguageId, term: string) =>
  words.filter((word) => !matches(word, language, term))
