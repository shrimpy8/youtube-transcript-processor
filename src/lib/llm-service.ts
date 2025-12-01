import { AISummaryResponse } from '@/types'
import { createLogger } from './logger'
import * as fs from 'fs/promises'
import * as path from 'path'
import { 
  getProviderConfig, 
  getProviderApiKey, 
  getProviderModelName,
  ALL_PROVIDERS,
  type LLMProviderKey 
} from './llm-config'
import { buildFullPrompt, handleApiResponseError } from './llm-api-helpers'

/**
 * Logger instance for LLM service
 */
const logger = createLogger('llm-service')

/**
 * Default prompt template (fallback if file can't be loaded)
 */
const DEFAULT_PROMPT_TEMPLATE = `You are an expert analyst specializing in extracting actionable insights from podcast transcripts. 

CRITICAL RULES:
1. Only use information explicitly stated in the transcript. Do NOT add, infer, or assume any information not directly present.
2. NO HALLUCINATION: If information is not explicitly mentioned, do not include it.
3. Cite transcript content when possible.

Extract key insights focusing on:
- AI tool best practices and workflows
- Technology trends and industry insights
- Product management techniques
- Skills product managers need in the AI age

Organize your summary into clear sections with actionable takeaways.`

/**
 * Loads the prompt template from docs/prompt.md
 * This is a server-side function and should only be called from API routes
 * 
 * @returns Promise resolving to the prompt template string
 * @throws Never throws - always returns a template (default if file can't be loaded)
 */
export async function loadPromptTemplate(): Promise<string> {
  try {
    const promptPath = path.join(process.cwd(), 'docs', 'prompt.md')
    logger.debug('Loading prompt template', { promptPath })
    
    const promptContent = await fs.readFile(promptPath, 'utf-8')
    const trimmedContent = promptContent.trim()
    
    logger.info('Prompt template loaded successfully', { 
      length: trimmedContent.length,
      path: promptPath 
    })
    
    return trimmedContent
  } catch (error) {
    logger.error('Failed to load prompt template, using default', error, {
      fallback: 'DEFAULT_PROMPT_TEMPLATE'
    })
    return DEFAULT_PROMPT_TEMPLATE
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
  maxRetries: number = 3,
  initialDelay: number = 1000
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

/**
 * Generates summary using Anthropic Claude API
 * Makes a direct API call to Anthropic's Messages API endpoint
 * 
 * @param transcript - The transcript text to summarize
 * @param promptTemplate - The prompt template to use for the request
 * @returns Promise resolving to the generated summary text
 * @throws Error if API key is not configured, API request fails, or no content is returned
 */
export async function generateAnthropicSummary(
  transcript: string,
  promptTemplate: string
): Promise<string> {
  const config = getProviderConfig('anthropic')
  const apiKey = getProviderApiKey('anthropic')
  const model = process.env[config.modelEnv] || config.defaultModel

  logger.debug('Generating Anthropic summary', {
    model,
    transcriptLength: transcript.length,
    promptLength: promptTemplate.length
  })

  // Validate API key exists and is not empty/whitespace
  if (!apiKey || !apiKey.trim()) {
    const error = new Error(`${config.apiKeyEnv} is not configured. Please set it in your .env.local file.`)
    logger.error('Anthropic API key not configured', error, { 
      config,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0
    })
    throw error
  }

  // Validate API key format (Anthropic keys typically start with 'sk-ant-')
  if (!apiKey.startsWith('sk-ant-')) {
    logger.warn('Anthropic API key format may be invalid', {
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      expectedPrefix: 'sk-ant-'
    })
  }

  const fullPrompt = buildFullPrompt(promptTemplate, transcript)

  return retryWithBackoff(async () => {
    logger.debug('Making Anthropic API request', {
      endpoint: 'https://api.anthropic.com/v1/messages',
      model,
      promptLength: fullPrompt.length
    })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      logger.error('Anthropic API request failed', undefined, {
        status: response.status,
        statusText: response.statusText
      })
      await handleApiResponseError(response, 'Anthropic')
    }

    const data = await response.json()
    const content = data.content?.[0]?.text
    
    if (!content) {
      logger.error('No content in Anthropic API response', undefined, {
        responseKeys: Object.keys(data),
        hasContent: !!data.content,
        contentLength: data.content?.length
      })
      throw new Error('No content returned from Anthropic API')
    }

    logger.info('Anthropic summary generated successfully', {
      contentLength: content.length,
      model
    })

    return content
  })
}

/**
 * Generates summary using Google Gemini API
 * Makes a direct API call to Google's Generative AI API endpoint
 * 
 * @param transcript - The transcript text to summarize
 * @param promptTemplate - The prompt template to use for the request
 * @returns Promise resolving to the generated summary text
 * @throws Error if API key is not configured, API request fails, or no content is returned
 */
export async function generateGeminiSummary(
  transcript: string,
  promptTemplate: string
): Promise<string> {
  const config = getProviderConfig('google-gemini')
  const apiKey = getProviderApiKey('google-gemini')
  const model = process.env[config.modelEnv] || config.defaultModel

  logger.debug('Generating Gemini summary', {
    model,
    transcriptLength: transcript.length,
    promptLength: promptTemplate.length
  })

  if (!apiKey) {
    const error = new Error(`${config.apiKeyEnv} is not configured`)
    logger.error('Gemini API key not configured', error, { config })
    throw error
  }

  const fullPrompt = buildFullPrompt(promptTemplate, transcript)

  return retryWithBackoff(async () => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    
    logger.debug('Making Gemini API request', {
      endpoint: url.split('?')[0], // Don't log API key
      model,
      promptLength: fullPrompt.length
    })
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4000,
          temperature: 0.7,
        },
      }),
    })

    if (!response.ok) {
      logger.error('Gemini API request failed', undefined, {
        status: response.status,
        statusText: response.statusText
      })
      await handleApiResponseError(response, 'Gemini')
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!content) {
      logger.error('No content in Gemini API response', undefined, {
        responseKeys: Object.keys(data),
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length
      })
      throw new Error('No content returned from Gemini API')
    }

    logger.info('Gemini summary generated successfully', {
      contentLength: content.length,
      model
    })

    return content
  })
}

/**
 * Generates summary using Perplexity API
 * Makes a direct API call to Perplexity's Chat Completions API endpoint
 * 
 * @param transcript - The transcript text to summarize
 * @param promptTemplate - The prompt template to use for the request
 * @returns Promise resolving to the generated summary text
 * @throws Error if API key is not configured, API request fails, or no content is returned
 */
export async function generatePerplexitySummary(
  transcript: string,
  promptTemplate: string
): Promise<string> {
  const config = getProviderConfig('perplexity')
  const apiKey = getProviderApiKey('perplexity')
  const model = process.env[config.modelEnv] || config.defaultModel

  logger.debug('Generating Perplexity summary', {
    model,
    transcriptLength: transcript.length,
    promptLength: promptTemplate.length
  })

  if (!apiKey) {
    const error = new Error(`${config.apiKeyEnv} is not configured`)
    logger.error('Perplexity API key not configured', error, { config })
    throw error
  }

  const fullPrompt = buildFullPrompt(promptTemplate, transcript)

  return retryWithBackoff(async () => {
    logger.debug('Making Perplexity API request', {
      endpoint: 'https://api.perplexity.ai/chat/completions',
      model,
      promptLength: fullPrompt.length
    })

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      logger.error('Perplexity API request failed', undefined, {
        status: response.status,
        statusText: response.statusText
      })
      await handleApiResponseError(response, 'Perplexity')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    
    if (!content) {
      logger.error('No content in Perplexity API response', undefined, {
        responseKeys: Object.keys(data),
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length
      })
      throw new Error('No content returned from Perplexity API')
    }

    logger.info('Perplexity summary generated successfully', {
      contentLength: content.length,
      model
    })

    return content
  })
}

/**
 * Generates summary for a specific provider
 * Routes the request to the appropriate provider-specific function
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
  const config = getProviderConfig(provider)
  const modelName = getProviderModelName(provider)
  
  logger.info('Generating summary for provider', {
    provider,
    modelName,
    transcriptLength: transcript.length
  })

  let summary: string

  try {
    switch (provider) {
      case 'anthropic':
        summary = await generateAnthropicSummary(transcript, promptTemplate)
        break
      case 'google-gemini':
        summary = await generateGeminiSummary(transcript, promptTemplate)
        break
      case 'perplexity':
        summary = await generatePerplexitySummary(transcript, promptTemplate)
        break
      default:
        const unknownError = new Error(`Unknown provider: ${provider}`)
        logger.error('Unknown provider specified', unknownError, { provider })
        throw unknownError
    }

    logger.info('Summary generated successfully', {
      provider,
      modelName,
      summaryLength: summary.length
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
      errorMessage
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

