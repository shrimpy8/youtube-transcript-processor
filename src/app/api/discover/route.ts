import { NextRequest, NextResponse } from 'next/server'
import { getPlaylistVideos, getChannelVideos } from '@/lib/ytdlp-service'
import { validateAndParseUrl } from '@/lib/youtube-validator'
import { VideoMetadata, ChannelInfo } from '@/types'
import { mapYtDlpError } from '@/lib/error-mapper'
import { handleApiError, createSuccessResponse, generateRequestId } from '@/lib/api-helpers'
import { createRateLimiter, getClientIp, rateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter'

const limiter = createRateLimiter(RATE_LIMIT_PRESETS.standard)

/**
 * POST /api/discover
 * Discovers videos from a YouTube playlist or channel
 */
/**
 * @swagger
 * /api/discover:
 *   post:
 *     summary: Discover videos from a playlist or channel
 *     description: Lists videos from a YouTube playlist or channel URL using yt-dlp.
 *     tags:
 *       - Discovery
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: YouTube playlist or channel URL
 *               type:
 *                 type: string
 *                 enum: [playlist, channel]
 *                 description: URL type (auto-detected if omitted)
 *               maxVideos:
 *                 type: integer
 *                 default: 100
 *                 description: Maximum number of videos to return (1–500)
 *     responses:
 *       200:
 *         description: Videos discovered successfully
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
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     url:
 *                       type: string
 *                     videoCount:
 *                       type: integer
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/VideoMetadata'
 *       400:
 *         description: Invalid input
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
    const { url, type, maxVideos = 100 } = body

    // Validate input
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    const validation = validateAndParseUrl(url)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    // Determine type if not provided
    const urlType = type || validation.type

    if (urlType !== 'playlist' && urlType !== 'channel') {
      return NextResponse.json(
        { error: 'URL must be a playlist or channel URL' },
        { status: 400 }
      )
    }

    // Validate maxVideos
    const maxVideosNum = Math.min(Math.max(1, parseInt(String(maxVideos)) || 100), 500)

    try {
      let videos: VideoMetadata[] = []

      if (urlType === 'playlist') {
        if (!validation.playlistId) {
          return NextResponse.json(
            { error: 'Playlist ID not found in URL' },
            { status: 400 }
          )
        }
        videos = await getPlaylistVideos(url, maxVideosNum)
      } else {
        // Channel
        videos = await getChannelVideos(url, maxVideosNum)
      }

      // Build channel/playlist info
      const info: ChannelInfo = {
        id: validation.playlistId || validation.channelId || '',
        title: urlType === 'playlist' ? 'Playlist' : 'Channel',
        url,
        videoCount: videos.length,
        videos,
      }

      return createSuccessResponse({
        data: info,
      }, 200, requestId)
    } catch (error: unknown) {
      // Map yt-dlp errors using error mapper
      throw mapYtDlpError(error)
    }
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to discover videos', requestId)
  }
}

