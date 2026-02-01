import { NextRequest, NextResponse } from 'next/server'
import { downloadSubtitles, extractVideoIdFromUrl, getVideoInfo } from '@/lib/ytdlp-service'
import { validateAndParseUrl } from '@/lib/youtube-validator'
import { mapYtDlpError } from '@/lib/error-mapper'
import { handleApiError, createSuccessResponse, generateRequestId } from '@/lib/api-helpers'
import { formatUploadDate } from '@/lib/date-utils'
import { NoTranscriptError } from '@/lib/errors'
import { createRateLimiter, getClientIp, rateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api/transcript/ytdlp')

const limiter = createRateLimiter(RATE_LIMIT_PRESETS.transcript)

/**
 * POST /api/transcript/ytdlp
 * Fetches transcript for a YouTube video using yt-dlp
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const clientIp = getClientIp(request)
    if (!limiter.check(clientIp)) {
      return rateLimitResponse()
    }

    const body = await request.json()
    const { url, videoId, options } = body

    // Validate input
    if (!url && !videoId) {
      return NextResponse.json(
        { error: 'URL or videoId is required' },
        { status: 400 }
      )
    }

    // Extract video ID or URL
    let finalUrl: string | null = null
    
    if (videoId) {
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return NextResponse.json(
          { error: 'Invalid video ID format' },
          { status: 400 }
        )
      }
      finalUrl = `https://www.youtube.com/watch?v=${videoId}`
    } else if (url) {
      const validation = validateAndParseUrl(url)
      if (!validation.isValid || validation.type !== 'video') {
        return NextResponse.json(
          { error: 'Invalid YouTube video URL' },
          { status: 400 }
        )
      }
      finalUrl = url
    }

    if (!finalUrl) {
      return NextResponse.json(
        { error: 'Could not extract video URL' },
        { status: 400 }
      )
    }

    // Extract video ID for response
    const extractedVideoId = extractVideoIdFromUrl(finalUrl) || videoId || 'unknown'

    // Validate options before passing to yt-dlp
    const ALLOWED_FORMATS = ['srt', 'vtt', 'ass', 'best']
    const language = options?.language || 'en'
    const format = options?.format || 'srt'

    if (!/^[a-z]{2}(-[a-zA-Z]{2,8})?$/.test(language)) {
      return NextResponse.json(
        { error: 'Invalid language code' },
        { status: 400 }
      )
    }
    if (!ALLOWED_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `Invalid subtitle format. Allowed: ${ALLOWED_FORMATS.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch transcript and video info in parallel
    try {
      const [segments, videoInfo] = await Promise.all([
        downloadSubtitles(finalUrl, {
          language,
          format,
          writeAutoSubs: options?.writeAutoSubs !== false,
        }),
        getVideoInfo(finalUrl).catch((error) => {
          // If video info fetch fails, log but don't fail the whole request
          logger.warn('Failed to fetch video info', { requestId, error: String(error) })
          return null
        }),
      ])
      
      // Check if transcript data is empty or invalid
      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        logger.info('No transcript found', { requestId, videoId: extractedVideoId })
        throw new NoTranscriptError(extractedVideoId)
      }

      // Format upload_date using utility
      const publishedAt = videoInfo?.upload_date 
        ? formatUploadDate(videoInfo.upload_date)
        : undefined

      logger.info('Successfully fetched transcript', { requestId, videoId: extractedVideoId, segmentCount: segments.length })
      return createSuccessResponse({
        data: {
          videoId: extractedVideoId,
          segments,
          segmentCount: segments.length,
          // Include video metadata if available
          ...(videoInfo && {
            title: videoInfo.title,
            channelTitle: videoInfo.channel,
            publishedAt,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
          }),
        },
      }, 200, requestId)
    } catch (error: unknown) {
      // Map yt-dlp errors using error mapper
      throw mapYtDlpError(error, { videoId: extractedVideoId })
    }
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch transcript', requestId)
  }
}

