# Code Quality Audit — ytpodcast-transcript2

> **Audited:** 2026-05-12
> **Scope:** All TypeScript source under `src/` (API routes, lib, hooks, components)
> **Purpose:** Identify issues with surgical fixes for Sonnet 4.6 to address. **No code was modified.**

---

## Priority Legend

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Security vulnerability, data corruption, or user-facing bug. Fix before deployment. |
| **HIGH** | Correctness bug, resource leak, or fragile logic causing production failures. |
| **MEDIUM** | Best-practice violation, maintainability concern, or brittle pattern. |
| **LOW** | Polish, consistency, missing documentation. |

---

## CRITICAL

### Issue #1: Gemini API Key Leaked in URL Query Parameter

**File:** `src/lib/llm-service.ts:261`

**Problem:** The Gemini adapter constructs the API URL with the key embedded in the query string:
```typescript
buildUrl(model, apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
}
```
This means the API key appears in:
- Server-side logs if the full URL is ever logged (line 374 strips `?` but only at `debug` level — if logging config changes, key leaks)
- Any error stack trace that includes the fetch URL
- Node.js `fetch` error messages which often include the URL

While Google's API requires the key as a query parameter, the key should never be stored in a variable that doubles as a loggable URL.

**Impact:** API key exposure in logs, error reports, or monitoring tools.

**Fix:**
```typescript
// llm-service.ts — Split URL construction from key injection
buildUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
},
buildHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,  // Google supports header-based auth
  }
},
```
Google's Generative Language API supports the `x-goog-api-key` header as an alternative to the query parameter. This avoids key exposure in URLs entirely.

**Verify:** Call the Gemini endpoint → confirm 200 OK with header-based auth. Grep logs for the API key string → confirm absent.

---

### Issue #2: Regex `.test()` with `g` Flag Causes Alternating Match Failures

**File:** `src/hooks/useTranscriptSearch.ts:86-95`

**Problem:** The `highlightText` callback creates a regex with the `gi` flag, then calls `regex.test(part)` in a `parts.map()` loop:
```typescript
const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi')
const parts = text.split(regex)
// ...
...parts.map((part, i) =>
  regex.test(part)   // <-- BUG: g flag means lastIndex advances
    ? createElement('mark', ...)
    : part
)
```
With the `g` flag, `regex.test()` is stateful — it remembers `lastIndex` between calls. After a successful match, the next call to `.test()` starts from the advanced position, causing it to return `false` for the next matching part. This produces alternating highlighted/unhighlighted matches.

**Impact:** Every other search match in a transcript segment fails to highlight. User sees inconsistent highlighting.

**Fix:**
```typescript
// useTranscriptSearch.ts:86 — Remove 'g' flag (test() doesn't need global)
const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi')
const parts = text.split(regex)
// ...
...parts.map((part, i) => {
  // Use case-insensitive comparison instead of stateful regex.test()
  const isMatch = part.toLowerCase() === searchQuery.toLowerCase()
  return isMatch
    ? createElement('mark', { key: i, className: 'bg-yellow-200 dark:bg-yellow-900' }, part)
    : part
})
```

**Verify:** Search for a word that appears 3+ times in a single transcript segment → all instances should be highlighted, not just odd-numbered ones.

---

### Issue #3: Fragile String-Based Error Classification

**File:** `src/app/api/transcript/route.ts:154-174`

**Problem:** The inner catch block classifies errors by string-matching on `error.message`:
```typescript
if (errorMessage.includes('Transcript is disabled') || 
    errorMessage.includes('No transcript') ||
    errorMessage.includes('transcript not available')) {
  throw new NoTranscriptError(finalVideoId)
}
```
The `youtube-transcript` library can change its error messages in any patch release. The same fragile pattern exists in `error-mapper.ts:20-101` with six separate `isXxxError()` functions that all do `errorMessage.includes(...)`.

Meanwhile, the project already has a proper error mapper (`src/lib/error-mapper.ts:109-142`) that the `ytdlp` route uses but the `transcript` route does not.

**Impact:** Error classification breaks silently when the upstream library updates error messages. Users see generic 500 errors instead of helpful 404s.

**Fix:**
```typescript
// transcript/route.ts:154-174 — Use the existing error mapper
} catch (error: unknown) {
  if (error instanceof NoTranscriptError) throw error
  throw mapYtDlpError(error, { videoId: finalVideoId! })
}
```
Then consolidate all string patterns into `error-mapper.ts` so there's a single source of truth for error classification.

**Verify:** Trigger a "Transcript disabled" error → confirm it returns 404 with `NO_TRANSCRIPT` type via the mapper path.

---

### Issue #4: Missing `catch` on Promise in `useProviderConfig`

**File:** `src/hooks/useAISummary.ts:19-24`

**Problem:**
```typescript
fetchProviderConfig().then(result => {
  if (!cancelled) {
    setProviders(result)
    setIsConfigLoading(false)
  }
})
// No .catch() — unhandled promise rejection
```
If `fetchProviderConfig()` throws (which it shouldn't per current implementation since it catches internally), or if `safeJsonParse` inside it throws an unexpected error, the promise rejection is unhandled.

**Impact:** Unhandled promise rejection warning in console; in strict React environments, can cause rendering issues.

**Fix:**
```typescript
// useAISummary.ts:19-24 — Add catch handler
fetchProviderConfig()
  .then(result => {
    if (!cancelled) {
      setProviders(result)
      setIsConfigLoading(false)
    }
  })
  .catch(() => {
    if (!cancelled) {
      setIsConfigLoading(false)
    }
  })
```

**Verify:** Mock a network failure in `fetchProviderConfig` → confirm no unhandled rejection warning, and `isConfigLoading` transitions to `false`.

---

## HIGH

### Issue #5: Memory Leak — `setInterval` Never Cleared in Cache Modules

**Files:** `src/lib/channel-cache.ts:114-118` and `src/lib/playlist-cache.ts:114-118`

**Problem:** Both files start a `setInterval` at module scope that runs indefinitely:
```typescript
if (typeof window !== 'undefined') {
  setInterval(() => {
    channelCache.clearExpired()
  }, 10 * 60 * 1000) // Never cleared!
}
```
There is no `clearInterval()` call anywhere. In a Next.js App Router environment with hot module replacement (HMR), each HMR cycle re-evaluates the module, starting a new interval without clearing the old one. Over time, this accumulates leaked intervals.

**Impact:** During development, dozens of stale intervals accumulate. In production (SPA), the interval persists but is a single leak — minor, but violates resource cleanup best practices.

**Fix:**
```typescript
// channel-cache.ts:113-118 — Store interval ID for cleanup
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null

if (typeof window !== 'undefined') {
  if (cleanupIntervalId !== null) clearInterval(cleanupIntervalId)
  cleanupIntervalId = setInterval(() => {
    channelCache.clearExpired()
  }, 10 * 60 * 1000)
}
```
Same pattern for `playlist-cache.ts`.

**Verify:** During HMR in development, confirm only one `clearExpired` call fires per 10-minute window (add a `console.debug` temporarily).

---

### Issue #6: DRY Violation — Triple-Duplicated Episode Mapping in `useFavoriteChannels`

**File:** `src/hooks/useFavoriteChannels.ts:133-141, 257-265` (and a third in `updateChannelFn`)

**Problem:** The same episode-mapping logic appears three times:
```typescript
const mapped: FavoriteChannelEpisode[] = res.data.episodes.map((ep) => ({
  channelId: ch.id,     // or newChannel.id
  videoId: ep.videoId,
  title: ep.title,
  publishedAt: ep.publishedAt,
  url: ep.url,
  thumbnail: ep.thumbnail,
  duration: ep.duration,
}))
```
This is copy-pasted across `fetchAllEpisodes`, `addChannel`, and `updateChannelFn`.

**Impact:** Any field change (e.g., adding `viewCount`) must be updated in three places. Forgetting one creates silent data inconsistency.

**Fix:** Extract a helper at the top of the file:
```typescript
function mapEpisodes(channelId: string, episodes: ChannelEpisode[]): FavoriteChannelEpisode[] {
  return episodes.map((ep) => ({
    channelId,
    videoId: ep.videoId,
    title: ep.title,
    publishedAt: ep.publishedAt,
    url: ep.url,
    thumbnail: ep.thumbnail,
    duration: ep.duration,
  }))
}
```
Then replace all three mapping sites with `mapEpisodes(ch.id, res.data.episodes)`.

**Verify:** Run existing tests → same behavior. Grep for the old mapping pattern → zero results.

---

### Issue #7: DRY Violation — Triplicated Video ID Extraction Logic

**Files:**
- `src/lib/youtube-validator.ts:29-43` — `extractVideoId()`
- `src/lib/ytdlp-core.ts:97-113` — `extractVideoIdFromUrl()`
- `src/app/api/channel/episodes/route.ts:218-226` — `extractChannelIdFromUrl()` (different purpose but overlapping regex patterns)

**Problem:** Two independent implementations of video ID extraction exist (`extractVideoId` and `extractVideoIdFromUrl`) with slightly different regex patterns. Both are imported in different routes. Similarly, `extractNameFromUrl` and `extractChannelIdFromUrl` in the episodes route duplicate logic from `youtube-validator.ts`'s `extractChannelId` and `extractChannelUsername`.

**Impact:** Bug fixes to URL parsing logic must be applied in multiple files. Current implementations already differ slightly (e.g., `ytdlp-core.ts` handles `embed/` but `youtube-validator.ts` handles `&v=` with a different regex).

**Fix:**
1. Keep `src/lib/youtube-validator.ts` as the single source of truth for all URL extraction.
2. Remove `extractVideoIdFromUrl` from `src/lib/ytdlp-core.ts` — re-export from `youtube-validator.ts` instead:
```typescript
// ytdlp-core.ts — Replace local implementation
export { extractVideoId as extractVideoIdFromUrl } from './youtube-validator'
```
3. In `channel/episodes/route.ts`, import `extractChannelId` and `extractChannelUsername` from `youtube-validator.ts` instead of defining local functions.
4. Update all import sites.

**Verify:** Run `npm test` → all existing tests pass with the consolidated functions.

---

### Issue #8: Unsafe Channel URL Fallback from Channel Name

**File:** `src/lib/ytdlp-channel.ts:94-97`

**Problem:**
```typescript
if (channelName) {
  const sanitized = channelName.toLowerCase().replace(/[^a-z0-9]/g, '')
  channelUrl = `https://www.youtube.com/@${sanitized}`
}
```
If `channelName` is something like `@!#$%`, the sanitized result is an empty string, producing the URL `https://www.youtube.com/@` — which is invalid and will 404 when fetched.

**Impact:** Invalid channel URL returned to client; downstream channel episode fetch fails with a confusing error.

**Fix:**
```typescript
// ytdlp-channel.ts:94-97 — Guard against empty sanitized name
if (channelName) {
  const sanitized = channelName.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (sanitized.length > 0) {
    channelUrl = `https://www.youtube.com/@${sanitized}`
    urlSource = 'channelName (sanitized)'
  }
}
if (!channelUrl) {
  throw new Error('Could not determine channel URL from video - missing all channel identifiers')
}
```

**Verify:** Pass a channel name with only special characters → confirm error thrown instead of invalid URL returned.

---

### Issue #9: `console.warn` in Production Code

**File:** `src/lib/api-client.ts:396`

**Problem:**
```typescript
console.warn('[fetchProviderConfig] Config endpoint unreachable, assuming all providers configured:', error)
```
The entire codebase uses a structured `createLogger()` utility, but this one call uses `console.warn` directly. This bypasses any log-level controls and outputs to the browser console in production.

**Impact:** Inconsistent logging; can't suppress in production; visible to end users opening DevTools.

**Fix:**
```typescript
// api-client.ts — Import and use the logger
import { createLogger } from './logger'
const logger = createLogger('api-client')

// Line 396
logger.warn('Config endpoint unreachable, assuming all providers configured', { error: String(error) })
```

**Verify:** Grep for `console.warn` and `console.log` across `src/lib/` — should be zero results (excluding test files).

---

### Issue #10: Rate Limiter Map Grows Unbounded

**File:** `src/lib/rate-limiter.ts:32-52`

**Problem:** The `Map<string, { count; resetAt }>` used by the rate limiter never evicts expired entries. Old entries remain in memory after their window expires. Under sustained traffic, this map grows without bound.

**Impact:** Memory leak proportional to unique client IPs over time. In serverless (Vercel), module-level state persists across warm invocations — the map can accumulate thousands of stale entries.

**Fix:** Add periodic cleanup or lazy eviction:
```typescript
export function createRateLimiter(config: RateLimiterConfig) {
  const map = new Map<string, { count: number; resetAt: number }>()

  function evictExpired() {
    const now = Date.now()
    for (const [key, entry] of map) {
      if (now > entry.resetAt) map.delete(key)
    }
  }

  return {
    check(ip: string): boolean {
      const now = Date.now()
      const entry = map.get(ip)

      // Lazy eviction: clean up every 100 checks
      if (map.size > 1000) evictExpired()

      if (!entry || now > entry.resetAt) {
        map.set(ip, { count: 1, resetAt: now + config.windowMs })
        return true
      }
      if (entry.count >= config.maxRequests) return false
      entry.count++
      return true
    },
  }
}
```

**Verify:** Simulate 2000 unique IPs → wait for window to expire → confirm map size is capped after next `check()` call.

---

## MEDIUM

### Issue #11: `any` Types on LLM Provider `extractContent` Methods

**File:** `src/lib/llm-service.ts:248, 276, 301`

**Problem:** All three provider adapters use `data: any` in `extractContent`:
```typescript
extractContent(data: any) {
  return data.content?.[0]?.text
}
```
Despite the `ProviderAdapter` interface defining `extractContent(data: Record<string, unknown>)` (line 217), the implementations use `any` (with an eslint-disable on line 224). This defeats TypeScript's type checking for API response handling.

**Impact:** If an LLM provider changes their response schema, the error surfaces as `undefined` at runtime instead of a compile-time type error.

**Fix:** Define typed response interfaces for each provider:
```typescript
interface AnthropicResponse {
  content?: Array<{ text?: string; type?: string }>
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

interface PerplexityResponse {
  choices?: Array<{ message?: { content?: string } }>
}
```
Then type each `extractContent`:
```typescript
extractContent(data: Record<string, unknown>) {
  const typed = data as AnthropicResponse
  return typed.content?.[0]?.text
}
```
Remove the `eslint-disable` on line 224.

**Verify:** `npx tsc --noEmit` passes with no type errors.

---

### Issue #12: Hardcoded Magic Numbers in Multiple Files

**Files:**
- `src/app/api/ai-summary/route.ts:146` — `500000` (max transcript length)
- `src/lib/llm-service.ts:71` — `50` (min output length)
- `src/lib/llm-service.ts:109` — `50000` (max prompt template size)
- `src/app/api/channel/episodes/route.ts:138` — `10` in `Math.max(limit * 3, 10)` fetch multiplier

**Problem:** These are tuning knobs scattered as magic numbers in business logic. They duplicate concepts already partially captured in `src/lib/constants.ts` (which has `MAX_FAVORITE_CHANNELS`, `MAX_EPISODES_PER_CHANNEL`, etc.) but the LLM-related constants are missing.

**Impact:** Changing limits requires finding hardcoded values across multiple files.

**Fix:** Add to `src/lib/constants.ts`:
```typescript
export const LLM_LIMITS = {
  MAX_TRANSCRIPT_LENGTH: 500_000,
  MIN_LLM_OUTPUT_LENGTH: 50,
  MAX_PROMPT_TEMPLATE_SIZE: 50_000,
} as const

export const CHANNEL_FETCH_MULTIPLIER = 3
export const CHANNEL_FETCH_MINIMUM = 10
```
Then import and use in the respective files.

**Verify:** Grep for `500000`, `50000`, `50` as standalone numeric literals in `src/` → should only appear in `constants.ts`.

---

### Issue #13: Missing JSON Parse Error Handling in API Routes

**Files:**
- `src/app/api/transcript/route.ts:79`
- `src/app/api/ai-summary/route.ts:102`
- `src/app/api/channel/episodes/route.ts:102`

**Problem:** All routes call `await request.json()` without try-catch:
```typescript
const body = await request.json()
```
If the request body is malformed JSON (or empty), this throws a `SyntaxError` which falls through to the outer catch block and returns a generic 500 error instead of a proper 400.

**Impact:** Clients sending malformed JSON see `"Failed to fetch transcript"` (500) instead of `"Invalid JSON in request body"` (400).

**Fix:** Wrap JSON parsing in each route:
```typescript
let body: Record<string, unknown>
try {
  body = await request.json()
} catch {
  return NextResponse.json(
    { error: 'Invalid JSON in request body', type: 'INVALID_INPUT' },
    { status: 400 }
  )
}
```
Alternatively, create a shared helper in `src/lib/api-helpers.ts`:
```typescript
export async function parseJsonBody(request: NextRequest): Promise<Record<string, unknown> | NextResponse> {
  try {
    return await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body', type: 'INVALID_INPUT' },
      { status: 400 }
    )
  }
}
```

**Verify:** Send a request with body `{invalid json` → confirm 400 response with clear error message.

---

### Issue #14: DRY Violation — Error Response Construction in `transcript/route.ts`

**File:** `src/app/api/transcript/route.ts:176-231`

**Problem:** The outer catch block has four separate `if (error instanceof XxxError)` blocks, each manually constructing a `NextResponse.json()` with slightly different shapes. Meanwhile, `src/lib/api-helpers.ts` already has a `handleApiError()` function that the `ytdlp/route.ts` uses (line 208).

**Impact:** Error response format inconsistency between the two transcript routes. The `transcript/route.ts` includes `suggestion` fields manually, while `handleApiError` has a consistent format.

**Fix:** Replace the entire outer catch block with:
```typescript
} catch (error: unknown) {
  return handleApiError(error, 'Failed to fetch transcript', requestId)
}
```
Ensure `handleApiError` includes `suggestion` fields for known error types (check `api-helpers.ts` implementation).

**Verify:** Trigger each error type (NoTranscript, VideoNotFound, NetworkError, RateLimitError) → confirm response format matches the ytdlp route.

---

### Issue #15: Inconsistent Error Response Format Across Routes

**Files:**
- `src/app/api/transcript/route.ts` — Returns `{ error, type, suggestion }` (no `success` field)
- `src/app/api/channel/episodes/route.ts` — Returns `{ success: false, error, type }` (has `success`)
- `src/app/api/ai-summary/route.ts` — Returns `{ success: false, error }` (has `success`, no `type`)
- `src/app/api/discover/route.ts` — Uses `handleApiError` (has `success` via helper)

**Problem:** The documented API contract says error responses have `{ error, type, suggestion? }` (per `docs/API.md`), but actual implementations vary. Some include `success: false`, some don't. Some include `type`, some don't.

**Impact:** Frontend error handling must account for multiple shapes; new routes may pick the wrong pattern.

**Fix:** Audit each route and ensure all error responses go through `handleApiError()` from `api-helpers.ts`, which should produce a consistent shape:
```typescript
{ success: false, error: string, type: ErrorType, suggestion?: string, requestId?: string }
```
Update `handleApiError` if it doesn't include all required fields.

**Verify:** Hit each error path across all routes → compare response shapes → all must match the documented format in `docs/API.md`.

---

### Issue #16: `extractChannelIdFromUrl` Returns Full URL as Fallback

**File:** `src/app/api/channel/episodes/route.ts:218-226`

**Problem:**
```typescript
function extractChannelIdFromUrl(url: string): string {
  const channelMatch = url.match(/\/channel\/([^/?#]+)/)
  if (channelMatch) return channelMatch[1]
  const handleMatch = url.match(/@([^/?#]+)/)
  if (handleMatch) return handleMatch[1]
  const cMatch = url.match(/\/c\/([^/?#]+)/)
  if (cMatch) return cMatch[1]
  return url  // <-- Returns full URL as "ID"
}
```
If no pattern matches, the full URL is returned as the channel ID. This is semantically wrong — it's not an ID.

**Impact:** Client receives a full URL in the `channel.id` field, which breaks any client-side logic that expects an ID format.

**Fix:**
```typescript
// Return a hash or 'unknown' instead of the raw URL
return url.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
```
Or better — since this function is only used once and duplicates `youtube-validator.ts`, remove it entirely per Issue #7.

**Verify:** Pass a non-standard channel URL → confirm `channel.id` is not the full URL.

---

### Issue #17: Missing `hasGenerated` Reset on New Summary Generation

**File:** `src/hooks/useAISummary.ts:196-215`

**Problem:** In the catch block of `generateSummary`, when all providers fail:
```typescript
} catch (error) {
  // ...
  setState(prev => ({
    ...prev,       // <-- hasGenerated not set to true
    loading: newLoading,
    errors: newErrors,
  }))
}
```
If the network fails entirely, `hasGenerated` remains at its previous value (false if this is the first attempt). The UI may not show error state since it checks `hasGenerated` to decide whether to display results.

**Impact:** After a network failure on first attempt, the user sees no feedback — neither success nor error.

**Fix:**
```typescript
setState(prev => ({
  ...prev,
  loading: newLoading,
  errors: newErrors,
  hasGenerated: true,  // <-- Signal that an attempt was made
}))
```

**Verify:** Disconnect network → trigger summary generation → confirm error state is displayed to user.

---

## LOW

### Issue #18: Hardcoded Anthropic API Version String

**File:** `src/lib/llm-config.ts:63`

**Problem:**
```typescript
apiVersion: '2023-06-01',
```
Anthropic's API version is hardcoded. While stable, when a new version is released, updating requires a code change and redeploy.

**Impact:** Low — Anthropic maintains backward compatibility — but violates the project's own config externalization principle.

**Fix:** Add to `.env.example`:
```
ANTHROPIC_API_VERSION=2023-06-01
```
In `llm-config.ts`:
```typescript
apiVersion: process.env.ANTHROPIC_API_VERSION || '2023-06-01',
```

**Verify:** Set `ANTHROPIC_API_VERSION=2024-01-01` → confirm header uses new version.

---

### Issue #19: Missing JSDoc on Several Public Functions

**Files:**
- `src/lib/api-client.ts` — `safeJsonParse()` lacks JSDoc
- `src/lib/channel-cache.ts` — `ChannelCache` class has JSDoc but is not exported as a type
- `src/lib/ytdlp-core.ts:75` — `extractOutputString()` has JSDoc but could note the edge case of non-string/non-object input

**Impact:** Minor — IDE tooltips and API documentation gaps.

**Fix:** Add concise JSDoc with `@param` and `@returns` to each function.

**Verify:** Visual inspection of JSDoc coverage.

---

### Issue #20: `playlist-cache.ts` Is a Copy-Paste of `channel-cache.ts`

**Files:** `src/lib/channel-cache.ts` and `src/lib/playlist-cache.ts`

**Problem:** Both files implement identical TTL-based caching logic with the same structure, the same `clearExpired` method, the same `setInterval` pattern. The only differences are the class name (`ChannelCache` vs `PlaylistCache`) and the type parameter for cached data.

**Impact:** Any bug fix (like Issue #5's interval leak) must be applied in both files. The pattern will likely be copy-pasted again for future cache needs.

**Fix:** Create a generic `TtlCache<T>` class in `src/lib/ttl-cache.ts`:
```typescript
export class TtlCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>()
  constructor(private readonly defaultTtl: number) {}
  get(key: string): T | null { /* ... */ }
  set(key: string, data: T, ttl?: number): void { /* ... */ }
  // ... rest of the interface
}
```
Then `channel-cache.ts` and `playlist-cache.ts` become one-liners:
```typescript
export const channelCache = new TtlCache<ChannelData>(5 * 60 * 1000)
```

**Verify:** Replace both caches → run existing tests → same behavior.

---

### Issue #21: Last Transcript Segment Duration Hardcoded to Zero

**File:** `src/app/api/transcript/route.ts:133-135`

**Problem:**
```typescript
duration: index < transcriptData.length - 1
  ? (transcriptData[index + 1].offset - item.offset) / 1000
  : 0, // Last segment has 0 duration
```
The last segment always gets `duration: 0`, losing timing information. This affects export formatting and any duration-based calculations.

**Impact:** Minor — last segment's duration display is always "0:00" in exports. Transcript viewer may show a jarring gap.

**Fix:** Use a reasonable default (e.g., average segment duration or a fixed value):
```typescript
const avgDuration = transcriptData.length > 1
  ? (transcriptData[transcriptData.length - 1].offset - transcriptData[0].offset) / (1000 * (transcriptData.length - 1))
  : 5
// ...
: avgDuration, // Last segment gets average duration
```

**Verify:** Export transcript with last segment → confirm non-zero duration.

---

### Issue #22: Inconsistent `type` Annotations on `ProviderAdapter` Methods

**File:** `src/lib/llm-service.ts:226-319`

**Problem:** The `ProviderAdapter` interface declares `extractContent(data: Record<string, unknown>)`, but all three implementations use `data: any` with an eslint-disable comment. The `buildBody` method returns `Promise<unknown>` in the interface but the implementations return typed objects that are immediately `JSON.stringify`'d. These type mismatches weaken the adapter pattern.

**Impact:** No runtime effect, but makes the type system leaky — future contributors may add new adapters with the wrong assumptions.

**Fix:** (Covered by Issue #11's typed response interfaces.) Additionally, make `buildBody` return a typed union or branded type to prevent accidentally passing the wrong shape to `JSON.stringify`.

**Verify:** `npx tsc --noEmit` passes after removing all `any` annotations.

---

---

## Resolutions

> **Fixed:** 2026-05-12 — All 22 issues resolved. Validated with `npx tsc --noEmit` (zero source errors) and ESLint (zero warnings). Unit tests: 9/9 passing.

| # | Title | File(s) | Status |
|---|-------|---------|--------|
| **CRITICAL** | | | |
| 1 | Gemini API key in URL query param | `src/lib/llm-service.ts` | ✅ Fixed — `buildUrl` no longer includes the key; `buildHeaders` sends `x-goog-api-key` header instead |
| 2 | Regex `.test()` with `g` flag | `src/hooks/useTranscriptSearch.ts` | ✅ Fixed — replaced `regex.test(part)` with `part.toLowerCase() === searchQuery.toLowerCase()` |
| 3 | Fragile string-based error classification | `src/app/api/transcript/route.ts`, `src/lib/error-mapper.ts` | ✅ Fixed — added missing patterns (`transcript is disabled`, `transcript not available`) to `isTranscriptUnavailableError`; inner catch now delegates to `mapYtDlpError` |
| 4 | Missing `.catch()` on Promise in `useProviderConfig` | `src/hooks/useAISummary.ts` | ✅ Fixed — added `.catch()` that transitions `isConfigLoading` to `false` on error |
| **HIGH** | | | |
| 5 | `setInterval` memory leak in cache modules | `src/lib/channel-cache.ts`, `src/lib/playlist-cache.ts` | ✅ Fixed — interval IDs stored; old interval cleared before starting new one on HMR |
| 6 | Triple-duplicated episode mapping | `src/hooks/useFavoriteChannels.ts` | ✅ Fixed — extracted `mapEpisodes(channelId, episodes)` helper; all 3 call sites use it |
| 7 | Triplicated video ID extraction | `src/lib/ytdlp-core.ts`, `src/app/api/channel/episodes/route.ts` | ✅ Fixed — `ytdlp-core.ts` re-exports `extractVideoId` from `youtube-validator.ts`; route uses `extractChannelId`/`extractChannelUsername` from the same module |
| 8 | Unsafe empty channel URL fallback | `src/lib/ytdlp-channel.ts` | ✅ Fixed — guarded `sanitized.length > 0` before constructing URL; falls through to throw if empty |
| 9 | `console.warn` in production code | `src/lib/api-client.ts` | ✅ Fixed — replaced with `logger.warn` via `createLogger('api-client')` |
| 10 | Unbounded rate limiter map | `src/lib/rate-limiter.ts` | ✅ Fixed — added `evictExpired()` with lazy eviction when `map.size > 1000` |
| **MEDIUM** | | | |
| 11 | `any` types on `extractContent` | `src/lib/llm-service.ts` | ✅ Fixed — added `AnthropicResponse`, `GeminiResponse`, `PerplexityResponse` interfaces; removed `eslint-disable` |
| 12 | Hardcoded magic numbers | `src/lib/constants.ts`, `src/app/api/ai-summary/route.ts`, `src/lib/llm-service.ts`, `src/app/api/channel/episodes/route.ts` | ✅ Fixed — added `LLM_LIMITS`, `CHANNEL_FETCH_MULTIPLIER`, `CHANNEL_FETCH_MINIMUM` to constants; all call sites import them |
| 13 | Missing JSON parse error handling | `src/app/api/transcript/route.ts`, `src/app/api/ai-summary/route.ts`, `src/app/api/channel/episodes/route.ts` | ✅ Fixed — all three routes wrap `request.json()` in try/catch returning 400 |
| 14 | Duplicated error response construction | `src/app/api/transcript/route.ts` | ✅ Fixed — outer catch replaced with `handleApiError(error, ..., requestId)` |
| 15 | Inconsistent error response format | `src/lib/api-helpers.ts` | ✅ Fixed — `createErrorResponse` now always includes `success: false`; all routes using it get consistent shape |
| 16 | `extractChannelIdFromUrl` returns full URL | `src/app/api/channel/episodes/route.ts` | ✅ Fixed — function now returns `string \| null` using `extractChannelId`/`extractChannelUsername`; call site falls back to sanitized URL slice |
| 17 | Missing `hasGenerated` on catch path | `src/hooks/useAISummary.ts` | ✅ Fixed — catch block now sets `hasGenerated: true` so UI shows error state after network failure |
| **LOW** | | | |
| 18 | Hardcoded Anthropic API version | `src/lib/llm-config.ts` | ✅ Fixed — reads `process.env.ANTHROPIC_API_VERSION` with `'2023-06-01'` fallback |
| 19 | Missing JSDoc | `src/lib/api-client.ts` | ✅ Fixed — added JSDoc with `@param`, `@returns`, `@throws` to `safeJsonParse` |
| 20 | Copy-paste cache duplication | `src/lib/ttl-cache.ts` (new), `src/lib/channel-cache.ts`, `src/lib/playlist-cache.ts` | ✅ Fixed — created `TtlCache<T>` generic class; both cache modules now delegate to it |
| 21 | Last segment duration hardcoded to 0 | `src/app/api/transcript/route.ts` | ✅ Fixed — last segment uses `avgDuration` (mean inter-segment interval, default 5s) |
| 22 | Type annotation inconsistencies on `ProviderAdapter` | `src/lib/llm-service.ts` | ✅ Fixed — covered by Issue #11; typed response interfaces remove all `any` from adapters |

---

## Additional Fixes

Issues found during the post-fix codebase sweep that followed the same patterns as the 22 documented issues.

### A1: Missing JSON Parse Guards in Three More Routes

**Files:** `src/app/api/discover/route.ts`, `src/app/api/transcript/ytdlp/route.ts`, `src/app/api/channel/route.ts`

**Problem:** Same unguarded `await request.json()` pattern as Issue #13. These three routes had not been covered by the original audit.

**Fix:** Wrapped all three in try/catch returning 400 with `'Invalid JSON in request body'`. Also applied proper `Record<string, unknown>` type narrowing so destructured values are correctly typed (string checks before use).

**Verified:** `npx tsc --noEmit` passes; ESLint clean.

---

### A2: `console.error` / `console.warn` in Three More Files

**Files:** `src/lib/url-type-helpers.ts`, `src/hooks/useCachedData.ts`, `src/hooks/useProcessingOptions.ts`

**Problem:** Same pattern as Issue #9 — direct `console.error` calls bypassing the structured `createLogger` utility.

**Fix:** Added `createLogger` instances to each file; replaced all `console.error` with `logger.warn` (these are recoverable errors, not fatal ones).

**Verified:** `npm run lint` passes; no `console.` calls remain in production source outside `logger.ts` and `performance-monitor.ts`.

---

## Summary

| Priority | Count | Key Themes |
|----------|-------|------------|
| **CRITICAL** | 4 | API key exposure, regex bug, fragile error classification, unhandled promise |
| **HIGH** | 6 | Memory leaks, DRY violations, unbounded map, unsafe URL construction |
| **MEDIUM** | 7 | Type safety, magic numbers, JSON parse errors, inconsistent error formats |
| **LOW** | 5 | Config externalization, copy-paste caches, missing JSDoc, duration bug |
| **Total** | **22** | |

### Recommended Fix Order

1. **Critical #1** (Gemini API key in URL) — highest security impact, straightforward header switch
2. **Critical #2** (regex `.test()` bug) — user-facing highlighting bug, one-line fix
3. **Critical #4** (missing `.catch()`) — one-line fix, prevents unhandled rejection
4. **Critical #3** (fragile error classification) — consolidate into `error-mapper.ts`
5. **High #5** (setInterval leak) — one-line fix in two files
6. **High #7** (DRY: video ID extraction) — consolidate to single source
7. **High #6** (DRY: episode mapping) — extract helper function
8. **High #10** (rate limiter map) — add lazy eviction
9. **High #8** (empty channel name) — add guard
10. **High #9** (console.warn) — switch to logger
11. **Medium #11-#17** — address in priority order
12. **Low #18-#22** — address as time permits
