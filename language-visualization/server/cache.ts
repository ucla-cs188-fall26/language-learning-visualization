import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '.cache')

// Concurrent identical requests, such as a prefetch and a retry, share one LLM call.
const inFlight = new Map<string, Promise<unknown>>()

const keyFor = (parts: unknown) =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex')

async function read<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch {
    return null // Missing or unreadable entries are treated as a cache miss.
  }
}

async function write(file: string, value: unknown) {
  await mkdir(CACHE_DIR, { recursive: true })
  // Rename into place so an interrupted write can't leave a partial entry.
  const temp = `${file}.${randomUUID()}.tmp`
  await writeFile(temp, JSON.stringify(value, null, 2))
  await rename(temp, file)
}

export async function cached<T>(label: string, keyParts: unknown, load: () => Promise<T>): Promise<T> {
  const key = keyFor(keyParts)
  const file = path.join(CACHE_DIR, `${key}.json`)

  const hit = await read<T>(file)
  if (hit !== null) {
    console.log(`[cache] hit  ${label}`)
    return hit
  }

  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  console.log(`[cache] miss ${label}`)
  const promise = load()
    .then(async (value) => {
      try {
        await write(file, value)
      } catch (error) {
        console.warn('[cache] could not save entry:', error)
      }
      return value
    })
    .finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}
