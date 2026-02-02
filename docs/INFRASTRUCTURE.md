# Infrastructure & Technical Architecture

## Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | Next.js | 15.5, App Router, Turbopack in dev |
| Language | TypeScript | 5, strict mode enabled |
| UI Library | React | 19 |
| Styling | Tailwind CSS | 4 |
| Component System | shadcn/ui | New York style, built on Radix UI primitives, Lucide icons |
| Unit Testing | Vitest | 4, jsdom environment |
| E2E Testing | Playwright | 1.57 |
| PDF Generation | jsPDF | 4 |
| Markdown Rendering | react-markdown | with remark-gfm plugin |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── transcript/           # Transcript fetching and processing
│       ├── channel/              # YouTube channel data
│       ├── discover/             # Video discovery
│       └── ai-summary/          # LLM-powered summarization
│           └── config            # Provider availability (booleans only)
│
├── components/
│   ├── ui/                       # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── layout/
│   │   ├── Header
│   │   └── Footer
│   └── features/
│       ├── VideoPreview
│       ├── ProcessingOptions
│       ├── TranscriptViewer
│       ├── AISummary
│       ├── FavoriteChannels       # Saved podcast channels with episode browsing
│       ├── SummarizePipelineModal # Step-by-step pipeline progress modal
│       ├── ExportControls
│       └── ...
│
├── lib/
│   ├── transcript-processor      # Core transcript parsing and formatting
│   ├── ytdlp-service             # yt-dlp integration for video metadata
│   ├── api-client                # Client-side API abstraction
│   ├── llm-service               # Unified LLM provider interface
│   ├── llm-config                # Provider model/temperature definitions
│   ├── rate-limiter              # Per-IP, per-endpoint rate limiting
│   └── errors                    # Structured error types
│
├── hooks/
│   ├── useChannelData
│   ├── useTranscriptProcessing
│   ├── useProcessingOptions
│   ├── useAISummary
│   ├── useUrlValidation
│   ├── useFavoriteChannels       # Channel CRUD, episode fetching, localStorage
│   ├── useUrlDetection           # Channel/playlist URL detection and resolution
│   ├── useUrlSubmission          # URL validation, transcript fetching, video state
│   └── useSummarizePipeline      # Pipeline orchestration (useReducer + refs)
│
└── types/
    └── index.ts                  # Shared type definitions
```

Prompt templates live outside `src/`:

```
prompts/
├── bullets.md
├── narrative.md
├── technical.md
└── fallback.md
```

---

## Build Pipeline

### Development

- **Bundler:** Turbopack for fast HMR and incremental compilation.
- **Command:** `next dev --turbopack`

### Production

- **Compiler:** SWC for minification and transpilation.
- **Command:** `next build`

### Code Splitting

Webpack configuration defines explicit chunk groups:

```js
// next.config.ts (simplified)
splitChunks: {
  cacheGroups: {
    vendor: { ... },   // node_modules
    common: { ... },   // shared application code
  }
}
```

### Asset Optimization

- **Images:** AVIF and WebP formats via `next/image`. Remote patterns configured for YouTube thumbnail domains (`i.ytimg.com`, `yt3.ggpht.com`).
- **Fonts:** Geist font family loaded with `display: swap` for zero layout shift.

---

## Testing

### Unit Tests (Vitest)

| Setting | Value |
|---------|-------|
| Environment | jsdom |
| Coverage provider | v8 |
| Coverage reporters | text, json, html |
| Path aliases | `@/` mapped to `src/` |
| Setup file | `vitest.setup.ts` |
| Library | React Testing Library |

Run with:

```bash
npx vitest
npx vitest --coverage
```

### E2E Tests (Playwright)

| Setting | Value |
|---------|-------|
| Browsers | Chromium, Firefox, WebKit |
| Dev server | Auto-started before test run |
| Execution | Parallel across browsers |

Run with:

```bash
npx playwright test
```

---

## Security

### Content Security Policy

CSP headers are configured in `next.config.ts`. The `connect-src` directive whitelists the following external origins:

- `https://api.anthropic.com` (Anthropic / Claude)
- `https://generativelanguage.googleapis.com` (Google Gemini)
- `https://api.perplexity.ai` (Perplexity / Sonar)

### HTTP Headers

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |

### Rate Limiting

- In-memory store, keyed by client IP address.
- Limits applied per API endpoint independently.
- No external dependencies (no Redis required).

### Input Validation

All API routes validate incoming parameters before processing.

### Secret Exposure Prevention

The `/api/ai-summary/config` endpoint returns only boolean flags indicating whether each provider is configured. API keys are never sent to the client.

---

## LLM Integration

### Providers

| Provider | Model | Temperature | Notes |
|----------|-------|-------------|-------|
| Anthropic | Claude Sonnet 4.5 | 0.7 | System + user message split (Anthropic best practice) |
| Google Gemini | 2.5 Flash | 0.7 | Single content block |
| Perplexity | Sonar | 0.7 | Single content block |

### Prompt Architecture

Prompt templates are stored as Markdown files in the `prompts/` directory:

| File | Purpose |
|------|---------|
| `bullets.md` | Bullet-point summary format |
| `narrative.md` | Prose/narrative summary format |
| `technical.md` | Technical deep-dive format |
| `fallback.md` | Default when no style is specified |

**Anthropic-specific behavior:** The LLM service constructs a two-part message (system message + user message), following Anthropic's recommended API pattern for separating instructions from content.

**Other providers:** Receive a single combined content block.

### Fail-Open Configuration

If the `/api/ai-summary/config` endpoint is unreachable, the client assumes all providers are configured and available. This prevents a config outage from disabling the summarization feature entirely.

---

## Favorite Channels & Summarize Pipeline

### Overview

Users can save up to 5 YouTube podcast channels and browse their latest episodes. A one-click "Summarize" button triggers an automated pipeline that fetches the transcript, processes it, and generates an AI summary.

### State Architecture

The main page (`page.tsx`) is a thin orchestrator with 0 `useState` calls. All state lives in 5 hooks:

| Hook | State Management | Variables |
|------|-----------------|-----------|
| `useProcessingOptions` | `useState` | Processing config |
| `useTranscriptProcessing` | `useState` | Transcript result, progress |
| `useUrlDetection` | `useState` | Channel/playlist detection (7 vars) |
| `useUrlSubmission` | `useState` | Video metadata, segments (7 vars) |
| `useSummarizePipeline` | `useReducer` | Pipeline modal, steps, summaries |

### Pipeline Steps

The summarize pipeline uses `useReducer` for predictable state transitions:

```
INIT → SET_STEP(1) → SET_STEP(2) → ... → COMPLETE → CLOSE
                                      └── FAIL → RETRY → INIT
```

On failure, a second failure triggers `CLOSE` with rollback to pre-pipeline state.

### Storage

All favorite channel data is persisted in `localStorage`. See [docs/features/FAVORITE_CHANNELS.md](./features/FAVORITE_CHANNELS.md) for details.

---

## Performance

### Caching

- **Session-based channel data cache** with a 5-minute TTL. Channel metadata is fetched once and reused across subsequent requests within the same session window.

### Request Deduplication

An in-flight request map prevents duplicate concurrent requests to the same resource. If a request for a given key is already pending, subsequent callers receive the same promise rather than triggering a new network call.

### React Optimizations

- `React.memo` on presentational components to avoid unnecessary re-renders.
- `useMemo` for expensive derived values (formatted transcripts, filtered lists).
- `useCallback` for event handlers passed as props.

### Loading Strategy

- **Lazy loading** of non-critical components (below-the-fold features).
- **Code splitting** via dynamic imports and the webpack chunk configuration described above.

### Monitoring

Web Vitals (LCP, FID, CLS) are tracked to surface performance regressions.

---

## How It Works

An interactive architecture overview is available at [`/how-it-works.html`](/how-it-works.html) within the running application. It provides a visual walkthrough of the transcript processing pipeline, LLM integration, and export flow.
