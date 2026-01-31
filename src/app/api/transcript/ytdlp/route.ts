import { NextRequest, NextResponse } from 'next/server'
import { downloadSubtitles, extractVideoIdFromUrl, getVideoInfo } from '@/lib/ytdlp-service'
import { validateAndParseUrl } from '@/lib/youtube-validator'
import { mapYtDlpError } from '@/lib/error-mapper'
import { handleApiError, createSuccessResponse } from '@/lib/api-helpers'
import { formatUploadDate } from '@/lib/date-utils'
import { NoTranscriptError } from '@/lib/errors'
import { createRateLimiter, getClientIp, rateLimitResponse } from '@/lib/rate-limiter'

/** Rate limiter: 20 requests per minute per IP */
const limiter = createRateLimiter({ maxRequests: 20, windowMs: 60_000 })

/**
 * POST /api/transcript/ytdlp
 * Fetches transcript for a YouTube video using yt-dlp
 */
export async function POST(request: NextRequest) {
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

    // Fetch transcript and video info in parallel
    try {
      const [segments, videoInfo] = await Promise.all([
        downloadSubtitles(finalUrl, {
          language: options?.language || 'en',
          format: options?.format || 'srt',
          writeAutoSubs: options?.writeAutoSubs !== false,
        }),
        getVideoInfo(finalUrl).catch((error) => {
          // If video info fetch fails, log but don't fail the whole request
          console.warn('Failed to fetch video info:', error)
          return null
        }),
      ])
      
      // Check if transcript data is empty or invalid
      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        console.log(`No transcript found for video ${extractedVideoId}`)
        throw new NoTranscriptError(extractedVideoId)
      }

      // Format upload_date using utility
      const publishedAt = videoInfo?.upload_date 
        ? formatUploadDate(videoInfo.upload_date)
        : undefined

      console.log(`Successfully fetched ${segments.length} segments for video ${extractedVideoId}`)
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
      })
    } catch (error: unknown) {
      // Map yt-dlp errors using error mapper
      throw mapYtDlpError(error, { videoId: extractedVideoId })
    }
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch transcript')
  }
}

