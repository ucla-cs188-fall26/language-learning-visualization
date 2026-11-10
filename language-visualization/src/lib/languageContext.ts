import { createContext, useContext } from 'react'
import { DEFAULT_LANGUAGE, getLanguage, isLanguageId } from '../../shared/languages.ts'
import type { Language, LanguageId } from '../../shared/languages.ts'

export const LanguageContext = createContext<Language>(getLanguage(DEFAULT_LANGUAGE))

export const useLanguage = () => useContext(LanguageContext)

const STORAGE_KEY = 'word-map:language'

export function loadLanguage(): LanguageId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLanguageId(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

export function persistLanguage(id: LanguageId) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // The choice just won't be remembered next time.
  }
}
