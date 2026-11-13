import type { LanguageId } from '../shared/languages.ts'
import type {
  ApiErrorBody,
  ApiErrorCode,
  ClusterRequest,
  ClusterResponse,
  CompareRequest,
  CompareResponse,
  SensesResponse,
} from '../shared/schemas.ts'

export class ApiError extends Error {
  readonly code: ApiErrorCode | 'unreachable'

  constructor(code: ApiError['code'], message: string) {
    super(message)
    this.code = code
  }
}

const UNREACHABLE = "Can't reach the word server. Make sure it's running with npm run dev."

async function post<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new ApiError('unreachable', UNREACHABLE)
  }

  // The Vite proxy answers with an empty, non-JSON error when the API server is down.
  const data: unknown = await response.json().catch(() => null)
  if (data === null) throw new ApiError('unreachable', UNREACHABLE)
  if (!response.ok) {
    const { error } = data as ApiErrorBody
    throw new ApiError(error.code, error.message)
  }
  return data as T
}

export const fetchSenses = (word: string, language: LanguageId, signal: AbortSignal) =>
  post<SensesResponse>('/api/senses', { word, language }, signal)

export const fetchCluster = (request: ClusterRequest, signal: AbortSignal) =>
  post<ClusterResponse>('/api/cluster', request, signal)

export const fetchComparison = (request: CompareRequest, signal: AbortSignal) =>
  post<CompareResponse>('/api/compare', request, signal)
