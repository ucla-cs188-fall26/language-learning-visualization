import { useReducer, useRef, useState } from 'react'
import { getLanguage } from '../shared/languages.ts'
import type { LanguageId } from '../shared/languages.ts'
import type {
  ClusterResponse,
  ClusterWord,
  CompareResponse,
  ContextId,
  Sense,
} from '../shared/schemas.ts'
import { ApiError, fetchCluster, fetchComparison, fetchSenses } from './api.ts'
import { ErrorNotice, Loading } from './components/common.tsx'
import { CompareView } from './components/CompareView.tsx'
import { ContextPrompt } from './components/ContextPrompt.tsx'
import { LanguageSelect } from './components/LanguageSelect.tsx'
import { MapScreen } from './components/MapScreen.tsx'
import { PersonalMap } from './components/PersonalMap.tsx'
import { SearchStep } from './components/SearchStep.tsx'
import { SenseChips } from './components/SenseChips.tsx'
import { LanguageContext, loadLanguage, persistLanguage } from './lib/languageContext.ts'
import {
  addSaved,
  isSavedFrom,
  loadSaved,
  persistSaved,
  removeSaved,
  removeSource,
} from './lib/savedWords.ts'
import type { SavedSource, SavedWord } from './lib/savedWords.ts'

interface Failure {
  message: string
  retryable: boolean
}

type Async<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; failure: Failure }
  | { status: 'ready'; data: T }

type Screen = 'start' | 'senses' | 'context' | 'map' | 'compare'

interface FlowState {
  screen: Screen
  word: string
  senses: Async<Sense[]>
  sense: Sense | null
  context: ContextId | null
  cluster: Async<ClusterResponse>
  focused: string | null
  selected: string[]
  comparison: Async<CompareResponse>
}

const initialState: FlowState = {
  screen: 'start',
  word: '',
  senses: { status: 'idle' },
  sense: null,
  context: null,
  cluster: { status: 'idle' },
  focused: null,
  selected: [],
  comparison: { status: 'idle' },
}

type Action =
  | { type: 'search'; word: string }
  | { type: 'senses'; result: Async<Sense[]> }
  | { type: 'pickSense'; sense: Sense }
  | { type: 'cluster'; result: Async<ClusterResponse> }
  | { type: 'chooseContext'; context: ContextId | null }
  | { type: 'setContext'; context: ContextId | null }
  | { type: 'focus'; term: string }
  | { type: 'toggleSelect'; term: string }
  | { type: 'comparison'; result: Async<CompareResponse> }
  | { type: 'back'; screen: Screen }

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'search':
      return { ...initialState, screen: 'senses', word: action.word, senses: { status: 'loading' } }
    case 'senses':
      return { ...state, senses: action.result }
    case 'pickSense':
      return {
        ...state,
        screen: 'context',
        sense: action.sense,
        context: null,
        cluster: { status: 'loading' },
        focused: null,
        selected: [],
        comparison: { status: 'idle' },
      }
    case 'cluster':
      return { ...state, cluster: action.result }
    case 'chooseContext':
      return { ...state, screen: 'map', context: action.context }
    case 'setContext':
      return { ...state, context: action.context }
    case 'focus':
      return { ...state, focused: action.term }
    case 'toggleSelect':
      if (state.selected.includes(action.term)) {
        return { ...state, selected: state.selected.filter((term) => term !== action.term) }
      }
      if (state.selected.length >= 3) return state
      return { ...state, selected: [...state.selected, action.term] }
    case 'comparison':
      return { ...state, screen: 'compare', comparison: action.result }
    case 'back':
      return { ...state, screen: action.screen }
  }
}

function toFailure(error: unknown): Failure {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      retryable: error.code !== 'invalid_input' && error.code !== 'refused',
    }
  }
  return { message: 'Something went wrong. Please try again.', retryable: true }
}

export default function App() {
  const [view, setView] = useState<'explore' | 'personal'>('explore')
  const [state, dispatch] = useReducer(reducer, initialState)
  const [language, setLanguage] = useState<LanguageId>(loadLanguage)
  const [saved, setSaved] = useState<SavedWord[]>(loadSaved)
  const [storageFailed, setStorageFailed] = useState(false)
  const activeRequest = useRef<AbortController | null>(null)

  // Only the latest request matters. Starting a new one cancels the previous one.
  function beginRequest() {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    return controller.signal
  }

  function pickSense(word: string, sense: Sense, target: LanguageId) {
    dispatch({ type: 'pickSense', sense })
    // Starts now, so the optional context prompt also covers part of the wait.
    loadCluster(word, sense, target)
  }

  function loadCluster(word: string, sense: Sense, target: LanguageId) {
    const signal = beginRequest()
    dispatch({ type: 'cluster', result: { status: 'loading' } })
    fetchCluster({ language: target, word, sense: { label: sense.label, example: sense.example } }, signal)
      .then((data) => {
        if (!signal.aborted) dispatch({ type: 'cluster', result: { status: 'ready', data } })
      })
      .catch((error: unknown) => {
        if (!signal.aborted) {
          dispatch({ type: 'cluster', result: { status: 'error', failure: toFailure(error) } })
        }
      })
  }

  function search(word: string, target: LanguageId = language) {
    const signal = beginRequest()
    dispatch({ type: 'search', word })
    fetchSenses(word, target, signal)
      .then(({ senses }) => {
        if (signal.aborted) return
        dispatch({ type: 'senses', result: { status: 'ready', data: senses } })
        if (senses.length === 1) pickSense(word, senses[0], target)
      })
      .catch((error: unknown) => {
        if (!signal.aborted) {
          dispatch({ type: 'senses', result: { status: 'error', failure: toFailure(error) } })
        }
      })
  }

  function compare() {
    const { sense, cluster, selected, word, context } = state
    if (!sense || cluster.status !== 'ready') return
    const words = selected.map((term) => {
      const match = cluster.data.words.find((entry) => entry.term === term)!
      return { term, gloss: match.gloss }
    })
    const signal = beginRequest()
    dispatch({ type: 'comparison', result: { status: 'loading' } })
    fetchComparison(
      { language, word, sense: { label: sense.label, example: sense.example }, words, context },
      signal,
    )
      .then((data) => {
        if (!signal.aborted) dispatch({ type: 'comparison', result: { status: 'ready', data } })
      })
      .catch((error: unknown) => {
        if (!signal.aborted) {
          dispatch({ type: 'comparison', result: { status: 'error', failure: toFailure(error) } })
        }
      })
  }

  // The meanings offered can differ by language, so a current search starts over.
  function changeLanguage(next: LanguageId) {
    setLanguage(next)
    persistLanguage(next)
    if (state.word) search(state.word, next)
  }

  function goBack(screen: Screen) {
    activeRequest.current?.abort()
    dispatch({ type: 'back', screen })
  }

  function updateSaved(next: SavedWord[]) {
    setSaved(next)
    setStorageFailed(!persistSaved(next))
  }

  const source: SavedSource | null = state.sense
    ? { word: state.word.toLowerCase(), senseLabel: state.sense.label, emoji: state.sense.emoji }
    : null

  const isSaved = (term: string) => (source ? isSavedFrom(saved, language, term, source) : false)

  function toggleSave(word: ClusterWord) {
    if (!source) return
    const { term, romanization, gloss, nuance } = word
    updateSaved(
      isSaved(term)
        ? removeSource(saved, language, term, source)
        : addSaved(saved, { language, term, romanization, gloss, nuance }, source),
    )
  }

  const { screen, senses, sense, cluster, comparison } = state
  const languageInfo = getLanguage(language)
  const savedHere = saved.filter((word) => word.language === language)

  return (
    <LanguageContext.Provider value={languageInfo}>
    <div className="app">
      <header className="app-header">
        <h1>Word Map</h1>
        <LanguageSelect value={language} onChange={changeLanguage} />
        <nav aria-label="Main">
          <button
            type="button"
            className="tab"
            aria-current={view === 'explore' ? 'page' : undefined}
            onClick={() => setView('explore')}
          >
            Explore
          </button>
          <button
            type="button"
            className="tab"
            aria-current={view === 'personal' ? 'page' : undefined}
            onClick={() => setView('personal')}
          >
            My map ({savedHere.length})
          </button>
        </nav>
      </header>

      {storageFailed && (
        <ErrorNotice message="Your browser couldn't store saved words, so they'll be lost when you close this page." />
      )}

      {view === 'personal' ? (
        <main>
          <PersonalMap
            words={savedHere}
            onRemove={(term) => updateSaved(removeSaved(saved, language, term))}
          />
        </main>
      ) : (
        <main>
          <SearchStep onSearch={(word) => search(word)} />

          {screen === 'start' && (
            <p className="intro">
              Search an English word to see the {languageInfo.name} words for it, how they differ, and
              which one suits your situation.
            </p>
          )}

          {screen === 'senses' && senses.status === 'loading' && (
            <Loading>Looking up “{state.word}”...</Loading>
          )}
          {screen === 'senses' && senses.status === 'error' && (
            <ErrorNotice
              message={senses.failure.message}
              onRetry={senses.failure.retryable ? () => search(state.word) : undefined}
            />
          )}
          {screen === 'senses' && senses.status === 'ready' && (
            <SenseChips
              word={state.word}
              senses={senses.data}
              onPick={(picked) => pickSense(state.word, picked, language)}
            />
          )}

          {screen === 'context' && (
            <>
              {senses.status === 'ready' && senses.data.length > 1 && (
                <BackButton label="Other meanings" onClick={() => goBack('senses')} />
              )}
              <ContextPrompt onChoose={(context) => dispatch({ type: 'chooseContext', context })} />
            </>
          )}

          {screen === 'map' && sense && (
            <>
              {senses.status === 'ready' && senses.data.length > 1 && (
                <BackButton label="Other meanings" onClick={() => goBack('senses')} />
              )}
              {cluster.status === 'loading' && <Loading>Building the word map...</Loading>}
              {cluster.status === 'error' && (
                <ErrorNotice
                  message={cluster.failure.message}
                  onRetry={cluster.failure.retryable ? () => loadCluster(state.word, sense, language) : undefined}
                />
              )}
              {cluster.status === 'ready' && (
                <MapScreen
                  word={state.word}
                  sense={sense}
                  words={cluster.data.words}
                  context={state.context}
                  focused={state.focused}
                  selected={state.selected}
                  isSaved={isSaved}
                  onContext={(context) => dispatch({ type: 'setContext', context })}
                  onFocus={(term) => dispatch({ type: 'focus', term })}
                  onToggleSelect={(term) => dispatch({ type: 'toggleSelect', term })}
                  onToggleSave={toggleSave}
                  onCompare={compare}
                />
              )}
            </>
          )}

          {screen === 'compare' && (
            <>
              <BackButton label="Back to the map" onClick={() => goBack('map')} />
              {comparison.status === 'loading' && <Loading>Comparing these words...</Loading>}
              {comparison.status === 'error' && (
                <ErrorNotice
                  message={comparison.failure.message}
                  onRetry={comparison.failure.retryable ? compare : undefined}
                />
              )}
              {comparison.status === 'ready' && cluster.status === 'ready' && (
                <CompareView
                  comparison={comparison.data}
                  words={cluster.data.words}
                  context={state.context}
                  isSaved={isSaved}
                  onToggleSave={toggleSave}
                />
              )}
            </>
          )}
        </main>
      )}
    </div>
    </LanguageContext.Provider>
  )
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="button button-quiet back" onClick={onClick}>
      ← {label}
    </button>
  )
}
