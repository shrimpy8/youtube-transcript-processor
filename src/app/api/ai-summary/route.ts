import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { LLMProvider, AISummaryRequest, AISummaryResponse } from '@/types'
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
 * POST /api/ai-summary
 * Generates AI summary from transcript using selected LLM provider(s)
 * 
 * @param request - Next.js request object containing transcript and provider in body
 * @returns JSON response with summaries array or error message
 * @remarks Supports single provider or 'all' for parallel generation across all providers
 */
export async function POST(request: NextRequest) {
  try {
    logger.debug('Received AI summary request')
    
    const body: AISummaryRequest = await request.json()
    const { transcript, provider } = body

    logger.debug('Parsed request body', {
      provider,
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
      transcriptLength: transcript.length
    })

    // Load prompt template once
    const promptTemplate = await loadPromptTemplate()
    logger.debug('Prompt template loaded', {
      templateLength: promptTemplate.length
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

