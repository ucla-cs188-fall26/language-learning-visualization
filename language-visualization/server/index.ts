import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { z } from 'zod'
import {
  ClusterRequestSchema,
  CompareRequestSchema,
  SensesRequestSchema,
} from '../shared/schemas.ts'
import type { ApiErrorBody } from '../shared/schemas.ts'
import { AppError, MODEL, getCluster, getComparison, getSenses } from './llm.ts'

const PORT = Number(process.env.PORT) || 8787

const app = new Hono()

// Requiring a JSON content type forces a CORS preflight, which this server
// doesn't answer, so other websites can't spend API credits through it.
async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const isJson = request.headers.get('content-type')?.startsWith('application/json')
  const body: unknown = isJson ? await request.json().catch(() => undefined) : undefined
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('invalid_input', 400, parsed.error.issues[0]?.message ?? 'Invalid request')
  }
  return parsed.data
}

app.post('/api/senses', async (c) => {
  const { word, language } = await parseBody(c.req.raw, SensesRequestSchema)
  return c.json(await getSenses(word, language))
})

app.post('/api/cluster', async (c) => {
  return c.json(await getCluster(await parseBody(c.req.raw, ClusterRequestSchema)))
})

app.post('/api/compare', async (c) => {
  return c.json(await getComparison(await parseBody(c.req.raw, CompareRequestSchema)))
})

app.onError((error, c) => {
  if (error instanceof AppError) {
    const body: ApiErrorBody = { error: { code: error.code, message: error.message } }
    return c.json(body, error.status)
  }
  console.error('[server] unexpected error:', error)
  const body: ApiErrorBody = {
    error: { code: 'upstream', message: 'Something went wrong on the server. Please try again.' },
  }
  return c.json(body, 500)
})

// Local only: this server has no authentication and spends API credits.
serve({ fetch: app.fetch, hostname: '127.0.0.1', port: PORT }, () => {
  console.log(`[server] listening on http://127.0.0.1:${PORT} using ${MODEL}`)
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.warn('[server] ANTHROPIC_API_KEY is not set. Add it to .env unless you use an `ant auth login` profile.')
  }
})
