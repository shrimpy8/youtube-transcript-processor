# Setup Guide

This guide walks through setting up the YouTube Podcast Transcript Processor for local development and production use.

## Prerequisites

Before starting, ensure the following are installed on your system:

| Dependency | Minimum Version | Installation |
|------------|----------------|--------------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) or `brew install node` |
| npm | Included with Node.js | Comes with Node.js |
| yt-dlp | Latest | `brew install yt-dlp` or `pip install yt-dlp` |

Verify each is available:

```bash
node --version    # Should print v20.x or higher
npm --version
yt-dlp --version
```

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/shrimpy8/ytpodcast-transcript2.git
cd ytpodcast-transcript2
npm install
```

## Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env   # if .env.example exists, otherwise create manually
```

All environment variables are listed below. For full details, see [docs/ENV_VARIABLES.md](./ENV_VARIABLES.md).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes (for AI Summary) | -- | API key for Anthropic Claude |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-5-20250929` | Anthropic model identifier |
| `ANTHROPIC_MODEL_NAME` | No | `Anthropic Sonnet 4.5` | Display name shown in the UI |
| `GOOGLE_GEMINI_API_KEY` | No | -- | API key for Google Gemini |
| `GOOGLE_GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model identifier |
| `GOOGLE_GEMINI_MODEL_NAME` | No | `Google Gemini 2.5 Flash` | Display name shown in the UI |
| `PERPLEXITY_API_KEY` | No | -- | API key for Perplexity |
| `PERPLEXITY_MODEL` | No | `sonar` | Perplexity model identifier |
| `PERPLEXITY_MODEL_NAME` | No | `Perplexity Sonar Online` | Display name shown in the UI |
| `DEBUG` | No | `false` | Set to `true` for verbose yt-dlp and application logging |

Example `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GEMINI_API_KEY=AIza...
PERPLEXITY_API_KEY=pplx-...
DEBUG=false
```

Only the API keys you plan to use need to be set. The model and display-name variables can be left at their defaults unless you want to override them.

## Running the Dev Server

Start the development server (uses Turbopack for fast refresh):

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Running Tests

### Unit Tests (Vitest)

```bash
npm test
```

Run with the interactive UI:

```bash
npm run test:ui
```

Run with coverage reporting:

```bash
npm run test:coverage
```

### End-to-End Tests (Playwright)

```bash
npm run test:e2e
```

Run with the Playwright UI:

```bash
npm run test:e2e:ui
```

#### Feature-Specific E2E Tests

The following headed-browser tests cover the Favorite Channels and AI Summary features. They require the dev server to be running and API keys configured in `.env.local`.

```bash
# Full feature test: add channels, delete, pipeline summarize, Get Transcript + narrative
# Includes a 5-minute wait between LLM calls to avoid rate limiting (~10 min total)
npx playwright test tests/e2e/full-feature-test.spec.ts --headed --project=chromium

# Quick narrative test: Get Transcript → Extract → Narrative AI Summary (all LLMs) → Download TXT
# (~60 seconds)
npx playwright test tests/e2e/get-transcript-narrative.spec.ts --headed --project=chromium
```

**Rate limiting note:** AI provider APIs may rate-limit repeated requests. Allow at least 5 minutes between test runs that trigger LLM calls.

## Building for Production

Build the optimized production bundle:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

The production server runs on port 3000 by default. Override with the `PORT` environment variable if needed.

## Troubleshooting

### yt-dlp not found

**Symptom:** Transcript extraction fails with an error indicating `yt-dlp` is not found.

**Fix:** Ensure `yt-dlp` is installed and available on your `PATH`:

```bash
which yt-dlp
```

If nothing is returned, install it:

```bash
# macOS
brew install yt-dlp

# pip (any platform)
pip install yt-dlp
```

After installation, restart your terminal and the dev server.

### API key errors

**Symptom:** AI summary returns an authentication or "missing key" error.

**Fix:**
1. Confirm the relevant API key is set in your `.env` file.
2. Make sure the key has no leading or trailing whitespace.
3. Restart the dev server after changing `.env` values -- Next.js only reads environment variables at startup.

### Port 3000 already in use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`

**Fix:** Either stop the process occupying port 3000 or start on a different port:

```bash
# Find and kill the process on port 3000
lsof -ti:3000 | xargs kill -9

# Or start on an alternate port
PORT=3001 npm run dev
```

### Transcript extraction hangs or times out

**Symptom:** The app appears stuck when fetching a transcript.

**Fix:**
1. Enable debug logging by setting `DEBUG=true` in your `.env` file and restarting the server.
2. Check the server console for detailed yt-dlp output.
3. Make sure `yt-dlp` is up to date: `brew upgrade yt-dlp` or `pip install --upgrade yt-dlp`.

---

## How It Works

Once the dev server is running, visit [`/how-it-works.html`](http://localhost:3000/how-it-works.html) for an interactive architecture overview that explains the transcript processing pipeline, LLM integration, and export flow.
