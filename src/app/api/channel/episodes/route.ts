import { NextRequest, NextResponse } from 'next/server'
import { getChannelVideos } from '@/lib/ytdlp-service'
import { isValidYouTubeUrl, getUrlType, extractChannelId, extractChannelUsername } from '@/lib/youtube-validator'
import { generateRequestId, createErrorResponse } from '@/lib/api-helpers'
import { mapChannelError } from '@/lib/error-mapper'
import { createRateLimiter, getClientIp, rateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter'
import { normalizeAndEncodeChannelUrl } from '@/lib/url-utils'
import { MAX_EPISODES_PER_CHANNEL, CHANNEL_FETCH_MULTIPLIER, CHANNEL_FETCH_MINIMUM } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api/channel/episodes')

const limiter = createRateLimiter(RATE_LIMIT_PRESETS.standard)

/**
 * POST /api/channel/episodes
 * Fetches recent episodes from a YouTube channel URL.
 * Sorts by publishedAt descending, returns top N.
 */
/**
 * @swagger
 * /api/channel/episodes:
 *   post:
 *     summary: Fetch recent channel episodes
 *     description: Returns the most recent episodes from a YouTube channel, sorted by publish date descending.
 *     tags:
 *       - Channel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channelUrl
 *             properties:
 *               channelUrl:
 *                 type: string
 *                 description: YouTube channel URL (e.g. https://youtube.com/@channel)
 *               maxEpisodes:
 *                 type: integer
 *                 default: 10
 *                 description: Maximum episodes to return (1–10)
 *     responses:
 *       200:
 *         description: Episodes fetched successfully
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
 *                     channel:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         url:
 *                           type: string
 *                     episodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           videoId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           publishedAt:
 *                             type: string
 *                             format: date-time
 *                           url:
 *                             type: string
 *                           thumbnail:
 *                             type: string
 *                             nullable: true
 *                           duration:
 *                             type: number
 *                             nullable: true
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Channel not found
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  let channelUrl = ''
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
        { success: false, error: 'Invalid JSON in request body', type: 'INVALID_INPUT' },
        { status: 400 }
      )
    }
    const { channelUrl: rawChannelUrl, maxEpisodes } = body
    channelUrl = typeof rawChannelUrl === 'string' ? rawChannelUrl : ''

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
    const fetchCount = Math.max(limit * CHANNEL_FETCH_MULTIPLIER, CHANNEL_FETCH_MINIMUM)
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
    // Falls back to sanitized URL slice if no identifier found (valid channel URLs always match)
    const channelId = extractChannelIdFromUrl(channelUrl) ?? channelUrl.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)

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
    return createErrorResponse(mapChannelError(error, { channelUrl }), 'Failed to fetch channel data. Please try again.', requestId)
  }
}

/**
 * Extracts a display name from a channel URL.
 * e.g. "https://youtube.com/@howiaipodcast" → "@howiaipodcast"
 */
function extractNameFromUrl(url: string): string {
  const username = extractChannelUsername(url)
  if (username) return `@${username}`
  const channelId = extractChannelId(url)
  if (channelId) return channelId
  return 'Unknown Channel'
}

/**
 * Extracts a channel identifier from URL for use as an ID.
 * Returns null if no identifier can be found (instead of the full URL).
 */
function extractChannelIdFromUrl(url: string): string | null {
  return extractChannelId(url) || extractChannelUsername(url) || null
}
