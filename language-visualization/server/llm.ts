import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'
import { getLanguage } from '../shared/languages.ts'
import type { LanguageId } from '../shared/languages.ts'
import {
  ClusterResponseSchema,
  CompareResponseSchema,
  SensesResponseSchema,
} from '../shared/schemas.ts'
import type {
  ApiErrorCode,
  ClusterRequest,
  ClusterResponse,
  CompareRequest,
  CompareResponse,
  SensesResponse,
  TermPhrase,
} from '../shared/schemas.ts'
import { cached } from './cache.ts'
import {
  CLUSTER_SYSTEM,
  COMPARE_SYSTEM,
  PROMPT_VERSION,
  SENSES_SYSTEM,
  clusterPrompt,
  comparePrompt,
  sensesPrompt,
} from './prompts.ts'

export const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5'

const MAX_SENSES = 5
const MAX_CLUSTER_WORDS = 9

export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly status: 400 | 422 | 429 | 502 | 503

  constructor(code: ApiErrorCode, status: AppError['status'], message: string) {
    super(message)
    this.code = code
    this.status = status
  }
}

const INVALID_RESPONSE = 'The word service returned an unusable response. Please try again.'

// Created on first use, so the server still starts and can report a clear
// error when credentials are missing.
let client: Anthropic | undefined

interface GenerateOptions<T extends z.ZodType> {
  system: string
  prompt: string
  schema: T
  effort: 'low' | 'medium'
}

async function generate<T extends z.ZodType>(options: GenerateOptions<T>): Promise<z.infer<T>> {
  client ??= new Anthropic({ timeout: 120_000 })

  let response
  try {
    response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: options.system,
      messages: [{ role: 'user', content: options.prompt }],
      output_config: {
        effort: options.effort,
        format: betaZodOutputFormat(options.schema),
      },
    })
  } catch (error) {
    throw toAppError(error)
  }

  if (response.stop_reason === 'refusal') {
    console.warn('[llm] refused:', response.stop_details?.category ?? 'no category')
    throw new AppError('refused', 422, "The word service declined this request. Try a different word.")
  }
  if (response.stop_reason === 'max_tokens' || response.parsed_output === null) {
    console.warn(`[llm] unusable response, stop reason: ${response.stop_reason}`)
    throw new AppError('upstream', 502, INVALID_RESPONSE)
  }
  return response.parsed_output as z.infer<T>
}

function toAppError(error: unknown): AppError {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AppError('not_configured', 503, 'The server has an invalid Anthropic API key. Check ANTHROPIC_API_KEY in .env.')
  }
  if (error instanceof Anthropic.RateLimitError) {
    console.warn('[llm] rate limited')
    return new AppError('rate_limited', 429, 'The word service is busy. Wait a moment and try again.')
  }
  if (error instanceof Anthropic.APIConnectionError) {
    console.warn('[llm] connection error:', error.message)
    return new AppError('upstream', 502, "The server couldn't reach the word service. Check its connection and try again.")
  }
  if (error instanceof Anthropic.APIError) {
    console.error(`[llm] API error ${error.status}:`, error.message)
    return new AppError('upstream', 502, 'The word service had a problem. Please try again.')
  }
  // The SDK raises a plain Error when it finds no credentials, so there's no typed class to check.
  if (error instanceof Error && error.message.includes('Could not resolve authentication method')) {
    return new AppError('not_configured', 503, 'The server has no Anthropic API key. Add ANTHROPIC_API_KEY to .env and restart it.')
  }
  // Output that fails schema validation also ends up here.
  console.error('[llm] unexpected error:', error)
  return new AppError('upstream', 502, INVALID_RESPONSE)
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value))

// Tolerates differences in case and Unicode form when matching a term the LLM echoed back.
const sameTerm = (a: string, b: string) =>
  a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase()

export function getSenses(word: string, language: LanguageId): Promise<SensesResponse> {
  const normalized = word.toLowerCase()
  return cached(`senses "${normalized}" (${language})`, ['senses', normalized, language, MODEL, PROMPT_VERSION], async () => {
    const result = await generate({
      system: SENSES_SYSTEM,
      prompt: sensesPrompt(normalized, language),
      schema: SensesResponseSchema,
      effort: 'low',
    })
    return { senses: result.senses.slice(0, MAX_SENSES) }
  })
}

export function getCluster(request: ClusterRequest): Promise<ClusterResponse> {
  const word = request.word.toLowerCase()
  const label = `cluster "${word}" / ${request.sense.label} (${request.language})`
  const hasRomanization = getLanguage(request.language).romanization !== null
  const keyParts = ['cluster', word, request.language, request.sense, MODEL, PROMPT_VERSION]
  return cached(label, keyParts, async () => {
    const result = await generate({
      system: CLUSTER_SYSTEM,
      prompt: clusterPrompt({ ...request, word }),
      schema: ClusterResponseSchema,
      effort: 'medium',
    })

    // The frontend identifies words by term, so duplicates can't be kept.
    const seen = new Set<string>()
    const words = result.words
      .filter((entry) => {
        const isNew = !seen.has(entry.term)
        seen.add(entry.term)
        return isNew
      })
      .slice(0, MAX_CLUSTER_WORDS)
      .map((entry) => ({
        ...entry,
        romanization: hasRomanization ? entry.romanization : '',
        formality: clamp(entry.formality),
        emotion: clamp(entry.emotion),
      }))

    if (words.length === 0) throw new AppError('upstream', 502, INVALID_RESPONSE)
    return { words }
  })
}

export function getComparison(request: CompareRequest): Promise<CompareResponse> {
  const word = request.word.toLowerCase()
  const terms = request.words.map((entry) => entry.term).join(', ')
  const hasRomanization = getLanguage(request.language).romanization !== null
  const keyParts = ['compare', word, request.language, request.sense, request.words, request.context, MODEL, PROMPT_VERSION]
  return cached(`compare "${word}" / ${terms} (${request.language})`, keyParts, async () => {
    const result = await generate({
      system: COMPARE_SYSTEM,
      prompt: comparePrompt({ ...request, word }),
      schema: CompareResponseSchema,
      effort: 'medium',
    })

    // Return results in the requested order, and reject a response that left a word out.
    const words = request.words.map(({ term: requested }) => {
      const match = result.words.find((entry) => sameTerm(entry.term, requested))
      if (!match) throw new AppError('upstream', 502, INVALID_RESPONSE)
      const withoutRomanization = (phrase: TermPhrase) => ({
        ...phrase,
        romanization: hasRomanization ? phrase.romanization : '',
      })
      return {
        ...match,
        term: requested,
        examples: match.examples.map(withoutRomanization),
        collocations: match.collocations.map(withoutRomanization),
      }
    })
    return { words, summary: result.summary }
  })
}
