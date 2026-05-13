import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { validateAndParseUrl } from '@/lib/youtube-validator'
import { NoTranscriptError } from '@/lib/errors'
import { mapYtDlpError } from '@/lib/error-mapper'
import { TranscriptSegment } from '@/types'
import { createRateLimiter, getClientIp, rateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter'
import { createLogger } from '@/lib/logger'
import { generateRequestId, handleApiError } from '@/lib/api-helpers'

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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', type: 'INVALID_INPUT' },
        { status: 400 }
      )
    }
    const url = typeof body.url === 'string' ? body.url : undefined
    const videoId = typeof body.videoId === 'string' ? body.videoId : undefined

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
      
      // Compute average segment duration to use as fallback for the last segment
      const avgDuration = transcriptData.length > 1
        ? (transcriptData[transcriptData.length - 1].offset - transcriptData[0].offset) / (1000 * (transcriptData.length - 1))
        : 5

      // Transform to our format
      const segments: TranscriptSegment[] = transcriptData.map((item, index) => ({
        text: item.text,
        start: item.offset / 1000, // Convert milliseconds to seconds
        duration: index < transcriptData.length - 1
          ? (transcriptData[index + 1].offset - item.offset) / 1000
          : avgDuration,
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
      // Pass through typed errors already thrown above (e.g. NoTranscriptError on empty result)
      if (error instanceof NoTranscriptError) throw error
      // Classify all other errors via the shared mapper (single source of truth)
      throw mapYtDlpError(error, { videoId: finalVideoId! })
    }
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch transcript', requestId)
  }
}

