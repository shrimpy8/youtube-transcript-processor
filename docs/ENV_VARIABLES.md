# Environment Variables Reference

This document lists all environment variables used in the codebase for the AI Summary feature.

## Required Environment Variables

### Anthropic Configuration
- `ANTHROPIC_API_KEY` - API key for Anthropic Claude API
- `ANTHROPIC_MODEL` - Model identifier (default: `claude-sonnet-4-20250514`)
- `ANTHROPIC_MODEL_NAME` - User-friendly display name (default: `Anthropic Sonnet 4.5`)

### Google Gemini Configuration
- `GOOGLE_GEMINI_API_KEY` - API key for Google Gemini API
- `GOOGLE_GEMINI_MODEL` - Model identifier (default: `gemini-2.5-flash`)
- `GOOGLE_GEMINI_MODEL_NAME` - User-friendly display name (default: `Google Gemini 2.5 Flash`)

### Perplexity Configuration
- `PERPLEXITY_API_KEY` - API key for Perplexity API
- `PERPLEXITY_MODEL` - Model identifier (default: `sonar`, which becomes `sonar`)
- `PERPLEXITY_MODEL_NAME` - User-friendly display name (default: `Perplexity Sonar Online`)

## Usage in Code

### File: `src/lib/llm-service.ts`

**Anthropic (lines 77-78, 277):**
- `process.env.ANTHROPIC_API_KEY`
- `process.env.ANTHROPIC_MODEL`
- `process.env.ANTHROPIC_MODEL_NAME`

**Google Gemini (lines 138-139, 281):**
- `process.env.GOOGLE_GEMINI_API_KEY`
- `process.env.GOOGLE_GEMINI_MODEL`
- `process.env.GOOGLE_GEMINI_MODEL_NAME`

**Perplexity (lines 204-205, 285):**
- `process.env.PERPLEXITY_API_KEY`
- `process.env.PERPLEXITY_MODEL`
- `process.env.PERPLEXITY_MODEL_NAME`

## Example .env File

```env
# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ANTHROPIC_MODEL_NAME=Anthropic Sonnet 4.5

# Google Gemini API Configuration
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key_here
GOOGLE_GEMINI_MODEL=gemini-2.5-flash
GOOGLE_GEMINI_MODEL_NAME=Google Gemini 2.5 Flash

# Perplexity API Configuration
PERPLEXITY_API_KEY=your_perplexity_api_key_here
PERPLEXITY_MODEL=sonar-online
PERPLEXITY_MODEL_NAME=Perplexity Sonar Online
```

## Verification Checklist

Make sure your `.env` file contains all 9 variables:
- [ ] ANTHROPIC_API_KEY
- [ ] ANTHROPIC_MODEL
- [ ] ANTHROPIC_MODEL_NAME
- [ ] GOOGLE_GEMINI_API_KEY
- [ ] GOOGLE_GEMINI_MODEL
- [ ] GOOGLE_GEMINI_MODEL_NAME
- [ ] PERPLEXITY_API_KEY
- [ ] PERPLEXITY_MODEL
- [ ] PERPLEXITY_MODEL_NAME

