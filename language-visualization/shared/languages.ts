// Used by both the server and the browser, so this file must not import zod.

export interface Language {
  id: string
  /** English name, shown in the UI. */
  name: string
  /** The language's name for itself, shown in the selector. */
  native: string
  /** BCP 47 tag, so browsers pick the right font and screen readers the right voice. */
  tag: string
  /** How the language is described to the LLM. */
  promptName: string
  /** The romanization to request, or null for languages written in Latin script. */
  romanization: string | null
}

// Ordered roughly by total number of speakers. English is left out because it's the search language.
export const LANGUAGES = [
  {
    id: 'mandarin',
    name: 'Mandarin',
    native: '中文',
    tag: 'zh-Hans',
    promptName: 'Mandarin Chinese, written in Simplified characters',
    romanization: 'pinyin with tone marks',
  },
  { id: 'hindi', name: 'Hindi', native: 'हिन्दी', tag: 'hi', promptName: 'Hindi, written in Devanagari', romanization: 'simple Latin transliteration' },
  { id: 'spanish', name: 'Spanish', native: 'Español', tag: 'es', promptName: 'Spanish', romanization: null },
  { id: 'french', name: 'French', native: 'Français', tag: 'fr', promptName: 'French', romanization: null },
  { id: 'arabic', name: 'Arabic', native: 'العربية', tag: 'ar', promptName: 'Modern Standard Arabic, written in Arabic script', romanization: 'simple Latin transliteration' },
  { id: 'bengali', name: 'Bengali', native: 'বাংলা', tag: 'bn', promptName: 'Bengali, written in Bengali script', romanization: 'simple Latin transliteration' },
  { id: 'portuguese', name: 'Portuguese', native: 'Português', tag: 'pt', promptName: 'Portuguese', romanization: null },
  { id: 'russian', name: 'Russian', native: 'Русский', tag: 'ru', promptName: 'Russian, written in Cyrillic', romanization: 'simple Latin transliteration' },
  { id: 'urdu', name: 'Urdu', native: 'اردو', tag: 'ur', promptName: 'Urdu, written in Urdu script', romanization: 'simple Latin transliteration' },
  { id: 'indonesian', name: 'Indonesian', native: 'Bahasa Indonesia', tag: 'id', promptName: 'Indonesian', romanization: null },
  { id: 'german', name: 'German', native: 'Deutsch', tag: 'de', promptName: 'German', romanization: null },
  { id: 'japanese', name: 'Japanese', native: '日本語', tag: 'ja', promptName: 'Japanese, written with kanji and kana as a native speaker would', romanization: 'Hepburn romaji' },
  { id: 'korean', name: 'Korean', native: '한국어', tag: 'ko', promptName: 'Korean, written in Hangul', romanization: 'Revised Romanization' },
  { id: 'vietnamese', name: 'Vietnamese', native: 'Tiếng Việt', tag: 'vi', promptName: 'Vietnamese', romanization: null },
  { id: 'turkish', name: 'Turkish', native: 'Türkçe', tag: 'tr', promptName: 'Turkish', romanization: null },
  { id: 'italian', name: 'Italian', native: 'Italiano', tag: 'it', promptName: 'Italian', romanization: null },
] as const satisfies readonly Language[]

export type LanguageId = (typeof LANGUAGES)[number]['id']

export const DEFAULT_LANGUAGE: LanguageId = 'mandarin'

export const isLanguageId = (value: unknown): value is LanguageId =>
  LANGUAGES.some((language) => language.id === value)

export const getLanguage = (id: LanguageId): Language =>
  LANGUAGES.find((language) => language.id === id)!
