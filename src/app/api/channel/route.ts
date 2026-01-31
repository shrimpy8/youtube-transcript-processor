import { NextRequest, NextResponse } from 'next/server'
import { getChannelInfoFromVideo, getChannelVideos } from '@/lib/ytdlp-service'
import { validateAndParseUrl } from '@/lib/youtube-validator'
import { ChannelDetails, VideoMetadata } from '@/types'
import { mapYtDlpError } from '@/lib/error-mapper'
import { handleApiError, createSuccessResponse } from '@/lib/api-helpers'
import { createRateLimiter, getClientIp, rateLimitResponse } from '@/lib/rate-limiter'

/** Rate limiter: 10 requests per minute per IP */
const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

/**
 * POST /api/channel
 * Gets channel information and videos from a video URL
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    if (!limiter.check(clientIp)) {
      return rateLimitResponse()
    }

    const body = await request.json()
    const { videoUrl } = body

    // Validate input
    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    const validation = validateAndParseUrl(videoUrl)
    if (!validation.isValid || validation.type !== 'video') {
      return NextResponse.json(
        { error: validation.error || 'Invalid YouTube video URL' },
        { status: 400 }
      )
    }

    try {
      // Get channel info from video
      const channelInfo = await getChannelInfoFromVideo(videoUrl)

      // Build channel details first (we'll add videos if available)
      const channelDetails: ChannelDetails = {
        id: channelInfo.channelId || '',
        name: channelInfo.channelName || 'Unknown Channel',
        url: channelInfo.channelUrl,
        videoCount: 0, // Will be updated if videos are fetched successfully
      }

      // Try to fetch channel videos, but don't fail if this doesn't work
      let topVideos: VideoMetadata[] = []
      try {
        // Fetch channel videos with view counts (get more than 10 to sort by popularity)
        const allVideos = await getChannelVideos(channelInfo.channelUrl, 50, true)
        
        // Sort videos by view count (highest first), fallback to date if view count unavailable
        const sortedVideos = allVideos.sort((a, b) => {
          // Primary sort: by view count (descending)
          if (a.viewCount !== undefined && b.viewCount !== undefined) {
            return b.viewCount - a.viewCount
          }
          // If one has view count and other doesn't, prioritize the one with view count
          if (a.viewCount !== undefined && b.viewCount === undefined) {
            return -1
          }
          if (a.viewCount === undefined && b.viewCount !== undefined) {
            return 1
          }
          // Fallback: sort by published date (most recent first)
          if (a.publishedAt && b.publishedAt) {
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          }
          return 0
        })

        // Get top 10 videos and add ranking numbers
        topVideos = sortedVideos.slice(0, 10).map((video, index) => ({
          ...video,
          rank: index + 1
        }))
        channelDetails.videoCount = allVideos.length
      } catch (videoError: unknown) {
        // Log the error but don't fail the entire request
        const videoErrorMessage = videoError instanceof Error ? videoError.message : String(videoError)
        console.warn('Failed to fetch channel videos:', videoErrorMessage)
        
        // If it's a 404, the channel might not be accessible or might not exist
        // Still return channel info but with empty videos list
        if (videoErrorMessage.includes('404') || videoErrorMessage.includes('Not Found')) {
          // Channel exists but videos can't be accessed - this is okay
          // Return channel info with empty videos
        } else {
          // For other errors, log but continue
          console.error('Channel videos fetch error:', videoError)
        }
      }

      return createSuccessResponse({
        data: {
          channel: channelDetails,
          videos: topVideos,
        },
      })
    } catch (error: unknown) {
      // Map yt-dlp errors using error mapper
      throw mapYtDlpError(error, { videoId: validation.videoId || 'unknown' })
    }
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to get channel information')
  }
}

