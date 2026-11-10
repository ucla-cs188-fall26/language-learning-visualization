import { z } from 'zod'
import { LANGUAGES } from './languages.ts'
import type { LanguageId } from './languages.ts'

// Shared by the API server (validation, LLM output format) and the frontend
// (types only, via `import type`, so zod stays out of the browser bundle).

export const CONTEXT_IDS = ['friend', 'boss', 'stranger', 'writing', 'text'] as const
export const ContextIdSchema = z.enum(CONTEXT_IDS)
export type ContextId = z.infer<typeof ContextIdSchema>

// --- LLM output. Bounds that the structured output format can't express are
// described in the prompts and enforced in server/llm.ts. ---

export const SenseSchema = z.object({
  id: z.string().describe('Short kebab-case id, unique within this response'),
  emoji: z.string().describe('A single emoji that evokes this sense'),
  label: z.string().describe('1-4 word label, such as "animal" or "sports equipment"'),
  example: z.string().describe('Short English example sentence using the word in this sense'),
})
export type Sense = z.infer<typeof SenseSchema>

export const SensesResponseSchema = z.object({ senses: z.array(SenseSchema) })
export type SensesResponse = z.infer<typeof SensesResponseSchema>

const RomanizationSchema = z
  .string()
  .describe('Romanization as the request specifies, or an empty string if it specifies none')

const FitSchema = z.object({
  rating: z.enum(['good', 'okay', 'poor']),
  reason: z.string().describe('One short sentence explaining this rating'),
})
export type Fit = z.infer<typeof FitSchema>

export const ClusterWordSchema = z.object({
  term: z.string().describe('The word or short phrase in the target language'),
  romanization: RomanizationSchema,
  gloss: z.string().describe('Brief English meaning'),
  nuance: z.string().describe('One line on what sets this word apart from the others'),
  formality: z.number().describe('-1 is the most formal in this cluster, 1 is the least formal'),
  emotion: z.number().describe('-1 is the most neutral in this cluster, 1 is the most emotional'),
  positionReason: z.string().describe('One short sentence explaining the two scores'),
  fit: z.object({
    friend: FitSchema,
    boss: FitSchema,
    stranger: FitSchema,
    writing: FitSchema,
    text: FitSchema,
  }),
})
export type ClusterWord = z.infer<typeof ClusterWordSchema>

export const ClusterResponseSchema = z.object({ words: z.array(ClusterWordSchema) })
export type ClusterResponse = z.infer<typeof ClusterResponseSchema>

const PhraseSchema = z.object({
  term: z.string(),
  romanization: RomanizationSchema,
  english: z.string(),
})
export type TermPhrase = z.infer<typeof PhraseSchema>

export const CompareResponseSchema = z.object({
  words: z.array(
    z.object({
      term: z.string().describe('Exactly as given in the request'),
      examples: z.array(PhraseSchema),
      collocations: z.array(PhraseSchema),
      useWhen: z.string().describe('A short summary beginning "Use this when"'),
    }),
  ),
  summary: z.string().describe('Two sentences at most on how to choose between these words'),
})
export type CompareResponse = z.infer<typeof CompareResponseSchema>

// --- API requests. These are untrusted input, so they have strict bounds. ---

const LanguageSchema = z.enum(LANGUAGES.map((language) => language.id) as [LanguageId, ...LanguageId[]])

const WordInputSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^[A-Za-z][A-Za-z' -]*$/, 'Enter an English word or short phrase')

const SenseInputSchema = z.object({
  label: z.string().trim().min(1).max(80),
  example: z.string().trim().min(1).max(240),
})

export const SensesRequestSchema = z.object({ word: WordInputSchema, language: LanguageSchema })

export const ClusterRequestSchema = z.object({
  language: LanguageSchema,
  word: WordInputSchema,
  sense: SenseInputSchema,
})
export type ClusterRequest = z.infer<typeof ClusterRequestSchema>

export const CompareRequestSchema = z.object({
  language: LanguageSchema,
  word: WordInputSchema,
  sense: SenseInputSchema,
  words: z
    .array(
      z.object({
        // Letters and marks from any script, plus punctuation that terms can contain, such as "apenado/a".
        term: z.string().trim().regex(/^[\p{L}\p{M}][\p{L}\p{M}\p{N}\s'’/().,·-]{0,59}$/u),
        gloss: z.string().trim().min(1).max(160),
      }),
    )
    .min(2)
    .max(3),
  context: ContextIdSchema.nullable(),
})
export type CompareRequest = z.infer<typeof CompareRequestSchema>

export type ApiErrorCode =
  | 'invalid_input'
  | 'not_configured'
  | 'rate_limited'
  | 'refused'
  | 'upstream'

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string }
}
