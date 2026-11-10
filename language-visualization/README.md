# Word Map app

For setup, see the [main README](../README.md). The app is a local prototype: the API server has no authentication and spends API credits, so it only listens on `127.0.0.1`. Add authentication and rate limiting before deploying it.

## How it fits together

```
React app (Vite) -- /api proxy --> Node API (Hono) --> Claude API
      |                                 |
 localStorage                     JSON file cache
 (personal map)                   (server/.cache/)
```

The browser never calls Claude directly, which keeps the API key on the server.

| Path                      | What's there                                                     |
| ------------------------- | ---------------------------------------------------------------- |
| `shared/schemas.ts`       | Zod schemas for API requests and LLM output, and the shared types |
| `server/prompts.ts`       | The prompts                                                      |
| `server/llm.ts`           | Claude calls, error handling and cleanup of LLM output           |
| `server/cache.ts`         | The JSON file cache                                              |
| `src/App.tsx`             | The flow state and API requests                                  |
| `src/components/`         | One component for each part of the flow                          |
| `src/lib/layout.ts`       | Word map and personal map layouts                                |
| `src/lib/direction.ts`    | The "I want something more..." logic                             |
| `src/lib/savedWords.ts`   | Saved words in `localStorage`                                    |

## Working on it

- **Changing a prompt:** increase `PROMPT_VERSION` in `server/prompts.ts`. Otherwise cached responses keep being returned.
- **Changing the model:** set `CLAUDE_MODEL` in `.env`.
- **Clearing the cache:** delete `server/.cache/`. The next lookup for each word then makes a new API call.
- **Adding a language:** add an entry to `shared/languages.ts`.
- **Content accuracy:** all language content is generated, so have a speaker of that language check it before relying on it in a demo or study.
