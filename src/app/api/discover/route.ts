import { NextRequest, NextResponse } from 'next/server'
import { getPlaylistVideos, getChannelVideos } from '@/lib/ytdlp-service'
import { validateAndParseUrl } from '@/lib/youtube-validator'
import { VideoMetadata, ChannelInfo } from '@/types'
import { mapYtDlpError } from '@/lib/error-mapper'
import { handleApiError, createSuccessResponse } from '@/lib/api-helpers'

/**
 * POST /api/discover
 * Discovers videos from a YouTube playlist or channel
 */
export async function POST(request: NextRequest) {
  try {
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
      })
    } catch (error: unknown) {
      // Map yt-dlp errors using error mapper
      throw mapYtDlpError(error)
    }
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to discover videos')
  }
}

