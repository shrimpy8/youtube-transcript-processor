import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { AISummaryRequest, AISummaryResponse, SummaryStyle } from '@/types'
import { 
  generateSummaryForProvider, 
  generateAllSummaries,
  loadPromptTemplate
} from '@/lib/llm-service'
import { handleApiError, createSuccessResponse } from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'

/**
 * Logger instance for AI summary API route
 */
const logger = createLogger('ai-summary-api')

/**
 * Simple in-memory rate limiter per IP
 * Limits requests to MAX_REQUESTS within WINDOW_MS per client IP.
 * Suitable for single-instance deployments (Vercel serverless functions
 * share module-level state within a warm instance).
 */
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10  // max 10 requests per minute per IP

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  entry.count++
  return true
}

/**
 * POST /api/ai-summary
 * Generates AI summary from transcript using selected LLM provider(s)
 *
 * @param request - Next.js request object containing transcript and provider in body
 * @returns JSON response with summaries array or error message
 * @remarks Supports single provider or 'all' for parallel generation across all providers
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by client IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    if (!checkRateLimit(clientIp)) {
      logger.warn('Rate limit exceeded', { clientIp })
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait a moment before generating another summary.',
        },
        { status: 429 }
      )
    }

    logger.debug('Received AI summary request')
    
    const body: AISummaryRequest = await request.json()
    const { transcript, provider, summaryStyle, videoUrl } = body

    // Default to 'bullets' for backward compatibility
    const style: SummaryStyle = summaryStyle && ['bullets', 'narrative', 'technical'].includes(summaryStyle)
      ? summaryStyle
      : 'bullets'

    logger.debug('Parsed request body', {
      provider,
      summaryStyle: style,
      hasVideoUrl: !!videoUrl,
      transcriptLength: transcript?.length,
      hasTranscript: !!transcript
    })

    // Validate input
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      logger.warn('Invalid transcript in request', {
        transcriptType: typeof transcript,
        transcriptLength: transcript?.length
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Transcript is required and must be a non-empty string' 
        },
        { status: 400 }
      )
    }

    if (!provider || !['anthropic', 'google-gemini', 'perplexity', 'all'].includes(provider)) {
      logger.warn('Invalid provider in request', { provider })
      return NextResponse.json(
        { 
          success: false,
          error: 'Valid provider is required. Must be one of: anthropic, google-gemini, perplexity, all' 
        },
        { status: 400 }
      )
    }

    // Validate transcript length (prevent abuse)
    const MAX_TRANSCRIPT_LENGTH = 500000
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      logger.warn('Transcript too long', {
        length: transcript.length,
        maxLength: MAX_TRANSCRIPT_LENGTH
      })
      return NextResponse.json(
        { 
          success: false,
          error: `Transcript is too long. Maximum length is ${MAX_TRANSCRIPT_LENGTH.toLocaleString()} characters.` 
        },
        { status: 400 }
      )
    }

    logger.info('Starting summary generation', {
      provider,
      summaryStyle: style,
      transcriptLength: transcript.length
    })

    // Load style-specific prompt template
    const promptTemplate = await loadPromptTemplate(style, videoUrl)
    logger.debug('Prompt template loaded', {
      templateLength: promptTemplate.length,
      style,
    })

    let summaries: AISummaryResponse[]

    // Generate summary(ies) based on provider selection
    if (provider === 'all') {
      logger.info('Generating summaries for all providers')
      // Generate summaries for all providers in parallel
      summaries = await generateAllSummaries(transcript, promptTemplate)
    } else {
      logger.info('Generating summary for single provider', { provider })
      // Generate summary for single provider
      const summary = await generateSummaryForProvider(provider, transcript, promptTemplate)
      summaries = [summary]
    }

    const successfulCount = summaries.filter(s => s.success).length
    const failedCount = summaries.filter(s => !s.success).length

    logger.info('Summary generation completed', {
      provider,
      totalSummaries: summaries.length,
      successfulCount,
      failedCount
    })

    // Return successful summaries (even if some failed when "all" is selected)
    return createSuccessResponse({
      summaries,
    })
  } catch (error: unknown) {
    logger.error('AI summary generation failed', error)
    return handleApiError(error, 'Failed to generate AI summary')
  }
}

