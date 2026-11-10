import type { ReactNode } from 'react'
import { useLanguage } from '../lib/languageContext.ts'

export function Term({ children }: { children: ReactNode }) {
  const { tag } = useLanguage()
  // dir="auto" lays out right-to-left scripts, such as Arabic and Urdu, correctly.
  return <span lang={tag} dir="auto">{children}</span>
}

export function Loading({ children }: { children: ReactNode }) {
  return (
    <p className="notice" role="status">
      <span className="spinner" aria-hidden="true" />
      {children}
    </p>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function AiNote() {
  return <p className="ai-note">AI-generated, so check before relying on it.</p>
}
