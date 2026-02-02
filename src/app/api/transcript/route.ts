import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { validateAndParseUrl } from '@/lib/youtube-validator'
import { NoTranscriptError, VideoNotFoundError, NetworkError, RateLimitError } from '@/lib/errors'
import { TranscriptSegment } from '@/types'
import { createRateLimiter, getClientIp, rateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter'
import { createLogger } from '@/lib/logger'
import { generateRequestId } from '@/lib/api-helpers'

const logger = createLogger('api/transcript')

const limiter = createRateLimiter(RATE_LIMIT_PRESETS.transcript)

/**
 * POST /api/transcript
 * Fetches transcript for a YouTube video
 */
/**
 * @swagger
 * /api/transcript:
 *   post:
 *     summary: Fetch transcript via YoutubeTranscript
 *     description: Fetches transcript segments for a YouTube video using the YoutubeTranscript library.
 *     tags:
 *       - Transcript
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: YouTube video URL
 *                 example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *               videoId:
 *                 type: string
 *                 description: YouTube video ID (alternative to url)
 *                 example: "dQw4w9WgXcQ"
 *     responses:
 *       200:
 *         description: Transcript fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 requestId:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     videoId:
 *                       type: string
 *                     segments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TranscriptSegment'
 *                     segmentCount:
 *                       type: integer
 *       400:
 *         description: Invalid input (missing URL/videoId or invalid format)
 *       404:
 *         description: No transcript available for this video
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const clientIp = getClientIp(request)
    if (!limiter.check(clientIp)) {
      return rateLimitResponse()
    }

    const body = await request.json()
    const { url, videoId } = body

    // Validate input
    if (!url && !videoId) {
      return NextResponse.json(
        { error: 'URL or videoId is required' },
        { status: 400 }
      )
    }

    // Extract video ID
    let finalVideoId: string | null = null
    
    if (videoId) {
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return NextResponse.json(
          { error: 'Invalid video ID format' },
          { status: 400 }
        )
      }
      finalVideoId = videoId
    } else if (url) {
      const validation = validateAndParseUrl(url)
      if (!validation.isValid || validation.type !== 'video') {
        return NextResponse.json(
          { error: 'Invalid YouTube video URL' },
          { status: 400 }
        )
      }
      finalVideoId = validation.videoId
    }

    if (!finalVideoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID' },
        { status: 400 }
      )
    }

    // Fetch transcript
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(finalVideoId)
      
      // Check if transcript data is empty or invalid
      if (!transcriptData || !Array.isArray(transcriptData) || transcriptData.length === 0) {
        logger.info('No transcript found', { requestId, videoId: finalVideoId })
        throw new NoTranscriptError(finalVideoId)
      }
      
      // Transform to our format
      const segments: TranscriptSegment[] = transcriptData.map((item, index) => ({
        text: item.text,
        start: item.offset / 1000, // Convert milliseconds to seconds
        duration: index < transcriptData.length - 1
          ? (transcriptData[index + 1].offset - item.offset) / 1000
          : 0, // Last segment has 0 duration
      }))

      // Double-check segments are valid
      if (segments.length === 0) {
        logger.info('Transformed segments are empty', { requestId, videoId: finalVideoId })
        throw new NoTranscriptError(finalVideoId)
      }

      logger.info('Successfully fetched transcript', { requestId, videoId: finalVideoId, segmentCount: segments.length })
      return NextResponse.json({
        success: true,
        requestId,
        data: {
          videoId: finalVideoId,
          segments,
          segmentCount: segments.length,
        },
      })
    } catch (error: unknown) {
      // Handle specific YouTube transcript errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('Transcript is disabled') || 
          errorMessage.includes('No transcript') ||
          errorMessage.includes('transcript not available')) {
        throw new NoTranscriptError(finalVideoId)
      }
      if (errorMessage.includes('Video unavailable')) {
        throw new VideoNotFoundError(finalVideoId)
      }
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        throw new RateLimitError()
      }
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        throw new NetworkError(errorMessage)
      }
      
      // Re-throw as generic error
      throw error
    }
  } catch (error: unknown) {
    // Handle known errors
    if (error instanceof NoTranscriptError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: error.type,
          suggestion: 'This video may not have captions enabled. Try another video.',
        },
        { status: error.statusCode }
      )
    }
    
    if (error instanceof VideoNotFoundError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: error.type,
        },
        { status: error.statusCode }
      )
    }
    
    if (error instanceof NetworkError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: error.type,
          suggestion: 'Please check your internet connection and try again.',
        },
        { status: error.statusCode }
      )
    }
    
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: error.type,
          suggestion: 'Please wait a moment and try again.',
        },
        { status: error.statusCode }
      )
    }

    // Unknown error — log details server-side, return generic message to client
    logger.error('Transcript fetch error', error, { requestId })
    return NextResponse.json(
      {
        requestId,
        error: 'Failed to fetch transcript',
        type: 'UNKNOWN',
      },
      { status: 500 }
    )
  }
}

