import { NextRequest, NextResponse } from 'next/server'
import { AISummaryRequest, AISummaryResponse, SummaryStyle } from '@/types'
import {
  generateSummaryForProvider,
  generateAllSummaries,
  loadPromptTemplate
} from '@/lib/llm-service'
import { handleApiError, createSuccessResponse, generateRequestId } from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'
import { createRateLimiter, getClientIp, rateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter'

/**
 * Logger instance for AI summary API route
 */
const logger = createLogger('ai-summary-api')

const limiter = createRateLimiter(RATE_LIMIT_PRESETS.standard)

/**
 * POST /api/ai-summary
 * Generates AI summary from transcript using selected LLM provider(s)
 *
 * @param request - Next.js request object containing transcript and provider in body
 * @returns JSON response with summaries array or error message
 * @remarks Supports single provider or 'all' for parallel generation across all providers
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    // Rate limit by client IP
    const clientIp = getClientIp(request)
    if (!limiter.check(clientIp)) {
      logger.warn('Rate limit exceeded', { requestId, clientIp })
      return rateLimitResponse()
    }

    logger.debug('Received AI summary request', { requestId })
    
    const body: AISummaryRequest = await request.json()
    const { transcript, provider, summaryStyle, videoUrl } = body

    // Default to 'bullets' for backward compatibility
    const style: SummaryStyle = summaryStyle && ['bullets', 'narrative', 'technical'].includes(summaryStyle)
      ? summaryStyle
      : 'bullets'

    logger.debug('Parsed request body', {
      requestId,
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

    // Validate videoUrl if provided — only YouTube URLs allowed
    let sanitizedVideoUrl: string | undefined = undefined
    if (videoUrl && typeof videoUrl === 'string') {
      try {
        const parsed = new URL(videoUrl)
        const allowed = ['youtube.com', 'www.youtube.com', 'youtu.be']
        if (allowed.some(d => parsed.hostname === d)) {
          sanitizedVideoUrl = videoUrl
        }
      } catch {
        // Invalid URL — ignore silently, don't inject into prompt
      }
    }

    logger.info('Starting summary generation', {
      requestId,
      provider,
      summaryStyle: style,
      transcriptLength: transcript.length
    })

    // Load style-specific prompt template
    const promptTemplate = await loadPromptTemplate(style, sanitizedVideoUrl)
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
      requestId,
      provider,
      totalSummaries: summaries.length,
      successfulCount,
      failedCount
    })

    // Return successful summaries (even if some failed when "all" is selected)
    return createSuccessResponse({
      summaries,
    }, 200, requestId)
  } catch (error: unknown) {
    logger.error('AI summary generation failed', error, { requestId })
    return handleApiError(error, 'Failed to generate AI summary', requestId)
  }
}

