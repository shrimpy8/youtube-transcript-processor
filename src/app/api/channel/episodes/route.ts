import { NextRequest, NextResponse } from 'next/server'
import { getChannelVideos } from '@/lib/ytdlp-service'
import { isValidYouTubeUrl, getUrlType } from '@/lib/youtube-validator'
import { handleApiError, generateRequestId } from '@/lib/api-helpers'
import { createRateLimiter, getClientIp, rateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter'
import { normalizeAndEncodeChannelUrl } from '@/lib/url-utils'
import { MAX_EPISODES_PER_CHANNEL } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api/channel/episodes')

const limiter = createRateLimiter(RATE_LIMIT_PRESETS.standard)

/**
 * POST /api/channel/episodes
 * Fetches recent episodes from a YouTube channel URL.
 * Sorts by publishedAt descending, returns top N.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const clientIp = getClientIp(request)
    if (!limiter.check(clientIp)) {
      return rateLimitResponse()
    }

    const body = await request.json()
    const { channelUrl, maxEpisodes } = body

    // Validate: channelUrl is required
    if (!channelUrl || typeof channelUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Channel URL is required', type: 'MISSING_FIELD' },
        { status: 400 }
      )
    }

    // Validate: must be a valid YouTube URL
    if (!isValidYouTubeUrl(channelUrl)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid YouTube channel URL', type: 'INVALID_URL' },
        { status: 400 }
      )
    }

    // Validate: must be a channel URL (not video or playlist)
    const urlType = getUrlType(channelUrl)
    if (urlType !== 'channel') {
      return NextResponse.json(
        { success: false, error: 'URL must be a YouTube channel, not a video or playlist', type: 'WRONG_URL_TYPE' },
        { status: 400 }
      )
    }

    // Clamp maxEpisodes
    const limit = Math.min(10, Math.max(1, typeof maxEpisodes === 'number' ? maxEpisodes : MAX_EPISODES_PER_CHANNEL))

    logger.info('Fetching channel episodes', { requestId, channelUrl, limit })

    // Fetch videos from channel — fetchViewCounts=false for speed,
    // we only need recency sort, not popularity.
    // Fetch more than needed so we can sort and pick the most recent.
    const fetchCount = Math.max(limit * 3, 10)
    const videos = await getChannelVideos(channelUrl, fetchCount, false)

    // Sort by publishedAt descending
    const sorted = [...videos].sort((a, b) => {
      if (a.publishedAt && b.publishedAt) {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      }
      if (a.publishedAt) return -1
      if (b.publishedAt) return 1
      return 0
    })

    const topEpisodes = sorted.slice(0, limit)

    // Extract channel name from first video's channelTitle, or from the URL
    const channelName = topEpisodes[0]?.channelTitle || extractNameFromUrl(channelUrl)
    const channelId = extractChannelIdFromUrl(channelUrl)

    const canonicalUrl = normalizeAndEncodeChannelUrl(channelUrl)

    logger.info('Channel episodes fetched', {
      requestId,
      channelName,
      episodeCount: topEpisodes.length,
      totalAvailable: videos.length,
    })

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        channel: {
          id: channelId,
          name: channelName,
          url: canonicalUrl,
        },
        episodes: topEpisodes.map((v) => ({
          videoId: v.id,
          title: v.title,
          publishedAt: v.publishedAt || new Date().toISOString(),
          url: v.url || `https://youtube.com/watch?v=${v.id}`,
          thumbnail: v.thumbnail || null,
          duration: v.duration || null,
        })),
      },
    })
  } catch (error: unknown) {
    logger.error('Failed to fetch channel episodes', error, { requestId })

    // Check for 404-like errors
    const errMsg = error instanceof Error ? error.message : String(error)
    if (errMsg.includes('404') || errMsg.includes('Not Found') || errMsg.includes('not found')) {
      return NextResponse.json(
        { success: false, requestId, error: 'Channel not found or is not accessible', type: 'CHANNEL_NOT_FOUND' },
        { status: 404 }
      )
    }

    return handleApiError(error, 'Failed to fetch channel data. Please try again.', requestId)
  }
}

/**
 * Extracts a display name from a channel URL.
 * e.g. "https://youtube.com/@howiaipodcast" → "@howiaipodcast"
 */
function extractNameFromUrl(url: string): string {
  const handleMatch = url.match(/@([^/?#]+)/)
  if (handleMatch) return `@${handleMatch[1]}`
  const channelMatch = url.match(/\/channel\/([^/?#]+)/)
  if (channelMatch) return channelMatch[1]
  const cMatch = url.match(/\/c\/([^/?#]+)/)
  if (cMatch) return cMatch[1]
  return url
}

/**
 * Extracts a channel identifier from URL for use as an ID.
 */
function extractChannelIdFromUrl(url: string): string {
  const channelMatch = url.match(/\/channel\/([^/?#]+)/)
  if (channelMatch) return channelMatch[1]
  const handleMatch = url.match(/@([^/?#]+)/)
  if (handleMatch) return handleMatch[1]
  const cMatch = url.match(/\/c\/([^/?#]+)/)
  if (cMatch) return cMatch[1]
  return url
}
