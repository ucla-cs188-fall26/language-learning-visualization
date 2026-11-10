import { LANGUAGES, isLanguageId } from '../../shared/languages.ts'
import type { LanguageId } from '../../shared/languages.ts'

interface Props {
  value: LanguageId
  onChange: (language: LanguageId) => void
}

export function LanguageSelect({ value, onChange }: Props) {
  return (
    <label className="language-select">
      Learning
      <select
        value={value}
        onChange={(event) => {
          if (isLanguageId(event.target.value)) onChange(event.target.value)
        }}
      >
        {LANGUAGES.map((language) => (
          <option key={language.id} value={language.id}>
            {language.name} · {language.native}
          </option>
        ))}
      </select>
    </label>
  )
}
