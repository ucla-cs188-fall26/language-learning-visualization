import { useState } from 'react'
import type { FormEvent } from 'react'

export function SearchStep({ onSearch }: { onSearch: (word: string) => void }) {
  const [value, setValue] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const word = value.trim()
    if (word) onSearch(word)
  }

  return (
    <form className="search" role="search" onSubmit={handleSubmit}>
      <label htmlFor="word-search">Enter an English word</label>
      <div className="search-row">
        <input
          id="word-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="bat, sad, melancholy"
          maxLength={40}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <button type="submit" className="button button-primary" disabled={!value.trim()}>
          Search
        </button>
      </div>
    </form>
  )
}
