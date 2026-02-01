import { AISummaryResponse, SummaryStyle } from '@/types'
import { createLogger } from './logger'
import * as fs from 'fs/promises'
import * as path from 'path'
import {
  getProviderConfig,
  getProviderApiKey,
  getProviderModelName,
  ALL_PROVIDERS,
  LLM_DEFAULTS,
  type LLMProviderKey,
  type ProviderConfig,
} from './llm-config'
import { buildFullPrompt, buildAnthropicPromptParts, handleApiResponseError } from './llm-api-helpers'

/**
 * Logger instance for LLM service
 */
const logger = createLogger('llm-service')

/**
 * Prompt templates directory (relative to project root)
 */
const PROMPTS_DIR = 'prompts'

/**
 * Fallback prompt file name (used when style-specific template fails to load)
 */
const FALLBACK_PROMPT_FILE = 'fallback.md'

/**
 * Maps summary style to the corresponding prompt template filename
 */
const STYLE_PROMPT_FILES: Record<SummaryStyle, string> = {
  bullets: 'bullets.md',
  narrative: 'narrative.md',
  technical: 'technical.md',
}

/**
 * Common refusal/error patterns that indicate the LLM did not process the transcript.
 * Shared across all providers.
 */
const REFUSAL_PATTERNS = [
  /you haven't.*provided.*transcript/i,
  /I need.*transcript/i,
  /please (share|provide).*transcript/i,
  /I appreciate your.*setup.*but/i,
  /I don't have.*transcript/i,
  /no transcript.*provided/i,
]

/**
 * Validates LLM output content.
 * Throws if the content looks like a refusal or is suspiciously short.
 *
 * @param content - The raw text returned by the LLM
 * @param providerName - Provider name for error messages
 */
function validateLLMOutput(content: string, providerName: string): void {
  // Check for refusal patterns
  const isRefusal = REFUSAL_PATTERNS.some(pattern => pattern.test(content))
  if (isRefusal) {
    logger.warn(`${providerName} returned a refusal response, will retry`, {
      contentPreview: content.substring(0, 200),
    })
    throw new Error(`${providerName} did not process the transcript. Please try again.`)
  }

  // Check for suspiciously short output (likely an error or non-summary)
  if (content.trim().length < 50) {
    logger.warn(`${providerName} returned suspiciously short output, will retry`, {
      contentLength: content.trim().length,
      contentPreview: content.substring(0, 200),
    })
    throw new Error(`${providerName} returned an incomplete response. Retrying...`)
  }
}

/**
 * Loads the prompt template for the given summary style
 * For bullets style, appends the video URL so the LLM can generate timestamp links
 *
 * @param style - Summary style to load prompt for (defaults to 'bullets')
 * @param videoUrl - YouTube video URL for timestamp links (used only for bullets style)
 * @returns Promise resolving to the prompt template string
 */
export async function loadPromptTemplate(
  style: SummaryStyle = 'bullets',
  videoUrl?: string
): Promise<string> {
  const filename = STYLE_PROMPT_FILES[style]

  try {
    const promptPath = path.join(process.cwd(), PROMPTS_DIR, filename)
    logger.debug('Loading prompt template', { promptPath, style })

    // Ensure prompt path doesn't escape the prompts directory (path traversal defense)
    const resolvedPath = path.resolve(promptPath)
    const expectedDir = path.resolve(process.cwd(), PROMPTS_DIR)
    if (!resolvedPath.startsWith(expectedDir)) {
      throw new Error('Prompt template path traversal detected')
    }

    const promptContent = await fs.readFile(promptPath, 'utf-8')
    let trimmedContent = promptContent.trim()

    // Sanity check: prompt templates should be reasonable size (< 50KB)
    if (trimmedContent.length > 50000) {
      logger.warn('Prompt template unusually large, possible tampering', { length: trimmedContent.length })
      throw new Error('Prompt template exceeds maximum expected size')
    }

    // For bullets style, inject the video URL so the LLM can build timestamp links
    if (style === 'bullets' && videoUrl) {
      trimmedContent += `\n\n## Video URL\n\nUse this exact URL for all timestamp links: ${videoUrl}`
    }

    logger.info('Prompt template loaded successfully', {
      length: trimmedContent.length,
      path: promptPath,
      style,
      hasVideoUrl: !!videoUrl,
    })

    return trimmedContent
  } catch (error) {
    logger.error('Failed to load prompt template, using fallback', error, {
      fallback: FALLBACK_PROMPT_FILE,
      style,
      filename,
    })
    // Try loading the fallback prompt file
    try {
      const fallbackPath = path.join(process.cwd(), PROMPTS_DIR, FALLBACK_PROMPT_FILE)
      const fallbackContent = await fs.readFile(fallbackPath, 'utf-8')
      return fallbackContent.trim()
    } catch (fallbackError) {
      // Hardcoded last-resort fallback if even the file is missing
      logger.error('Both primary and fallback prompt files are missing — using hardcoded last-resort prompt', fallbackError)
      return 'You are an expert analyst. Summarize the following podcast transcript with actionable insights. Only use information explicitly stated in the transcript.'
    }
  }
}

/**
 * Retry logic with exponential backoff
 * Implements exponential backoff strategy for handling transient API failures
 * 
 * @param fn - Function to retry (should return a Promise)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelay - Initial delay in milliseconds before first retry (default: 1000)
 * @returns Promise resolving to the result of fn()
 * @throws The last error encountered if all retries fail
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = LLM_DEFAULTS.maxRetries,
  initialDelay: number = LLM_DEFAULTS.initialRetryDelayMs
): Promise<T> {
  let lastError: Error | unknown
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.debug('Executing function attempt', { 
        attempt: attempt + 1, 
        maxRetries 
      })
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        logger.debug('Retry attempt failed, waiting before retry', { 
          attempt: attempt + 1, 
          maxRetries, 
          delayMs: delay,
          error: error instanceof Error ? error.message : String(error)
        })
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        logger.warn('All retry attempts exhausted', {
          maxRetries,
          finalError: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }
  
  throw lastError
}

// ---------------------------------------------------------------------------
// Provider Adapter Pattern
// Each adapter encapsulates the provider-specific differences:
// URL construction, headers, request body shape, and response content path.
// ---------------------------------------------------------------------------

/**
 * Adapter interface for LLM provider-specific API details
 */
interface ProviderAdapter {
  /** Display name for logging and error messages */
  name: string
  /** Build the API endpoint URL */
  buildUrl(model: string, apiKey: string): string
  /** Build request headers */
  buildHeaders(apiKey: string, config: ProviderConfig): Record<string, string>
  /** Build request body from prompt and config */
  buildBody(params: {
    model: string
    transcript: string
    promptTemplate: string
    config: ProviderConfig
  }): Promise<unknown>
  /** Extract content string from the parsed API response */
  extractContent(data: Record<string, unknown>): string | undefined
  /** Optional: validate API key format before making request */
  validateApiKey?(apiKey: string): void
  /** Optional: provider-specific response validation beyond shared checks */
  validateResponse?(content: string, promptTemplate: string): void
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const anthropicAdapter: ProviderAdapter = {
  name: 'Anthropic',
  buildUrl() {
    return 'https://api.anthropic.com/v1/messages'
  },
  buildHeaders(apiKey, config) {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': config.apiVersion || '2023-06-01',
    }
  },
  async buildBody({ model, transcript, promptTemplate, config }) {
    const { systemPrompt, userMessage } = await buildAnthropicPromptParts(promptTemplate, transcript)
    return {
      model,
      max_tokens: config.maxOutputTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: LLM_DEFAULTS.temperature,
    }
  },
  extractContent(data: any) {
    return data.content?.[0]?.text
  },
  validateApiKey(apiKey) {
    if (!apiKey.startsWith('sk-ant-')) {
      logger.warn('Anthropic API key format may be invalid — check ANTHROPIC_API_KEY in .env.local')
    }
  },
}

const geminiAdapter: ProviderAdapter = {
  name: 'Gemini',
  buildUrl(model, apiKey) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  },
  buildHeaders() {
    return { 'Content-Type': 'application/json' }
  },
  async buildBody({ transcript, promptTemplate, config }) {
    const fullPrompt = buildFullPrompt(promptTemplate, transcript)
    return {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: config.maxOutputTokens,
        temperature: LLM_DEFAULTS.temperature,
      },
    }
  },
  extractContent(data: any) {
    return data.candidates?.[0]?.content?.parts?.[0]?.text
  },
}

const perplexityAdapter: ProviderAdapter = {
  name: 'Perplexity',
  buildUrl() {
    return 'https://api.perplexity.ai/chat/completions'
  },
  buildHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }
  },
  async buildBody({ model, transcript, promptTemplate, config }) {
    const fullPrompt = buildFullPrompt(promptTemplate, transcript)
    return {
      model,
      messages: [{ role: 'user', content: fullPrompt }],
      max_tokens: config.maxOutputTokens,
      temperature: LLM_DEFAULTS.temperature,
    }
  },
  extractContent(data: any) {
    return data.choices?.[0]?.message?.content
  },
  validateResponse(content, promptTemplate) {
    const isTechnicalPrompt = promptTemplate.includes('### 1. Tools & Technologies')
    if (isTechnicalPrompt) {
      const hasSection1 = /###?\s*1\.\s*Tools/i.test(content)
      const hasSection2 = /###?\s*2\.\s*Workflows/i.test(content)
      if (!hasSection1 || !hasSection2) {
        logger.warn('Perplexity returned incomplete Technical summary, will retry', {
          hasSection1,
          hasSection2,
          contentPreview: content.substring(0, 200),
        })
        throw new Error('Perplexity returned an incomplete summary (missing sections). Retrying...')
      }
    }
  },
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Provider adapter registry — maps provider key to its adapter
 */
const PROVIDER_ADAPTERS: Record<LLMProviderKey, ProviderAdapter> = {
  'anthropic': anthropicAdapter,
  'google-gemini': geminiAdapter,
  'perplexity': perplexityAdapter,
}

/**
 * Generic LLM summary generation using provider adapters.
 * Handles the shared workflow: validate key → build request → retry fetch →
 * extract content → validate output.
 *
 * @param provider - LLM provider key
 * @param transcript - Transcript text to summarize
 * @param promptTemplate - Prompt template for the request
 * @returns Promise resolving to the generated summary text
 */
async function generateLLMSummary(
  provider: LLMProviderKey,
  transcript: string,
  promptTemplate: string
): Promise<string> {
  const adapter = PROVIDER_ADAPTERS[provider]
  const config = getProviderConfig(provider)
  const apiKey = getProviderApiKey(provider)
  const model = process.env[config.modelEnv] || config.defaultModel

  logger.debug(`Generating ${adapter.name} summary`, {
    model,
    transcriptLength: transcript.length,
    promptLength: promptTemplate.length,
  })

  // Validate API key exists
  if (!apiKey || !apiKey.trim()) {
    const error = new Error(`${config.apiKeyEnv} is not configured. Please set it in your .env.local file.`)
    logger.error(`${adapter.name} API key not configured`, error, { config })
    throw error
  }

  // Provider-specific key format check
  adapter.validateApiKey?.(apiKey)

  return retryWithBackoff(async () => {
    const url = adapter.buildUrl(model, apiKey)
    const headers = adapter.buildHeaders(apiKey, config)
    const body = await adapter.buildBody({ model, transcript, promptTemplate, config })

    logger.debug(`Making ${adapter.name} API request`, {
      endpoint: url.split('?')[0], // Don't log API key in query params
      model,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(LLM_DEFAULTS.fetchTimeoutMs),
    })

    if (!response.ok) {
      logger.error(`${adapter.name} API request failed`, undefined, {
        status: response.status,
        statusText: response.statusText,
      })
      await handleApiResponseError(response, adapter.name)
    }

    const data = await response.json()
    const content = adapter.extractContent(data)

    if (!content) {
      logger.error(`No content in ${adapter.name} API response`, undefined, {
        responseKeys: Object.keys(data),
      })
      throw new Error(`No content returned from ${adapter.name} API`)
    }

    // Shared validation (refusal patterns, minimum length)
    validateLLMOutput(content, adapter.name)

    // Provider-specific validation (e.g. Perplexity technical section check)
    adapter.validateResponse?.(content, promptTemplate)

    logger.info(`${adapter.name} summary generated successfully`, {
      contentLength: content.length,
      model,
    })

    return content
  })
}

/**
 * Generates summary for a specific provider
 *
 * @param provider - LLM provider to use ('anthropic', 'google-gemini', or 'perplexity')
 * @param transcript - Transcript text to summarize
 * @param promptTemplate - Prompt template to use (should be loaded via loadPromptTemplate)
 * @returns Promise resolving to AISummaryResponse with success status and summary or error
 */
export async function generateSummaryForProvider(
  provider: LLMProviderKey,
  transcript: string,
  promptTemplate: string
): Promise<AISummaryResponse> {
  const modelName = getProviderModelName(provider)

  logger.info('Generating summary for provider', {
    provider,
    modelName,
    transcriptLength: transcript.length,
  })

  try {
    const summary = await generateLLMSummary(provider, transcript, promptTemplate)

    logger.info('Summary generated successfully', {
      provider,
      modelName,
      summaryLength: summary.length,
    })

    return {
      provider,
      modelName,
      summary,
      success: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    logger.error('Error generating summary for provider', error, {
      provider,
      modelName,
      errorMessage,
    })

    return {
      provider,
      modelName,
      summary: '',
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Generates summaries for all providers in parallel
 * Executes summary generation for all configured providers concurrently
 * 
 * @param transcript - Transcript text to summarize
 * @param promptTemplate - Prompt template to use (should be loaded via loadPromptTemplate)
 * @returns Promise resolving to array of AISummaryResponse (one per provider)
 * @remarks Each provider's summary generation runs independently, so partial failures are handled gracefully
 */
export async function generateAllSummaries(
  transcript: string,
  promptTemplate: string
): Promise<AISummaryResponse[]> {
  logger.info('Generating summaries for all providers', {
    providerCount: ALL_PROVIDERS.length,
    providers: ALL_PROVIDERS,
    transcriptLength: transcript.length
  })

  const promises = ALL_PROVIDERS.map(provider => 
    generateSummaryForProvider(provider, transcript, promptTemplate)
  )

  const results = await Promise.all(promises)
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  logger.info('All provider summaries completed', {
    total: results.length,
    successful,
    failed
  })

  return results
}

