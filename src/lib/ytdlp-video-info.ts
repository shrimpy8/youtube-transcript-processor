import { VideoMetadata } from '@/types'
import { normalizeVideoUrl } from './url-utils'
import { mapYtDlpError } from './error-mapper'
import { createTimer } from './utils'
import { formatUploadDate } from './date-utils'
import {
  ytdlpLogger as logger,
  getYtDlpInstance,
  extractOutputString,
  extractVideoIdOrUnknown,
  YTDLP_JSON_ARGS,
  type YtDlpOutput,
  type YtDlpVideoInfo,
  type YtDlpJsonInfo,
} from './ytdlp-core'

/**
 * Gets video information without downloading
 * @param videoUrl - YouTube video URL or video ID
 * @returns Video metadata
 */
export async function getVideoInfo(videoUrl: string): Promise<YtDlpVideoInfo> {
  const timer = createTimer()
  timer.start()
  logger.info('Getting video info', { videoUrl })

  const ytDlp = getYtDlpInstance()
  const fullUrl = normalizeVideoUrl(videoUrl)
  logger.debug('Normalized video URL', { original: videoUrl, normalized: fullUrl })

  try {
    const args = [fullUrl, ...YTDLP_JSON_ARGS]
    logger.debug('yt-dlp command args', { args })

    logger.info('Executing yt-dlp command for video info')
    const output = await ytDlp.execPromise(args)
    const outputStr = extractOutputString(output as YtDlpOutput)

    logger.debug('Parsing yt-dlp JSON output', { outputLength: outputStr.length })
    let info: YtDlpJsonInfo
    try {
      info = JSON.parse(outputStr.trim())
    } catch (parseError) {
      logger.error('Failed to parse yt-dlp JSON output', parseError, {
        outputLength: outputStr.length,
        outputPreview: outputStr.substring(0, 200),
      })
      throw new Error('Invalid JSON response from yt-dlp')
    }

    const videoInfo: YtDlpVideoInfo = {
      id: info.id || '',
      title: info.title || 'Unknown',
      url: fullUrl,
      duration: info.duration || undefined,
      thumbnail: info.thumbnail || (info.thumbnails as Array<{ url?: string }> | undefined)?.[0]?.url,
      channel: (info.channel || info.uploader) as string | undefined,
      description: info.description,
      upload_date: info.upload_date,
    }

    logger.info('Video info retrieved successfully', {
      videoId: videoInfo.id,
      title: videoInfo.title,
      duration: timer.elapsedMs(),
    })

    return videoInfo
  } catch (error) {
    logger.error('Failed to get video info', error, {
      videoUrl,
      fullUrl,
      duration: timer.elapsedMs(),
    })
    const videoId = extractVideoIdOrUnknown(fullUrl)
    throw mapYtDlpError(error, { videoId })
  }
}

/**
 * Fetches metadata for a single video (view count and upload date)
 * @param videoUrl - YouTube video URL or ID
 * @returns Object with view count and upload date, or undefined if unavailable
 */
export async function fetchVideoMetadata(videoUrl: string): Promise<{ viewCount?: number; uploadDate?: string } | undefined> {
  try {
    const ytDlp = getYtDlpInstance()
    const fullUrl = normalizeVideoUrl(videoUrl)

    const args = [fullUrl, ...YTDLP_JSON_ARGS]

    const output = await ytDlp.execPromise(args)
    const outputStr = extractOutputString(output as YtDlpOutput)
    const info: YtDlpJsonInfo = JSON.parse(outputStr.trim())

    return {
      viewCount: info.view_count,
      uploadDate: info.upload_date,
    }
  } catch (error) {
    logger.debug('Failed to fetch video metadata', { videoUrl, error })
    return undefined
  }
}

/**
 * Fetches view counts and published dates for multiple videos in parallel batches
 * @param videos - Array of videos to enrich
 * @param batchSize - Number of videos to fetch in parallel (default: 10)
 * @returns Array of videos with updated view counts and published dates
 */
export async function enrichVideosWithViewCounts(
  videos: VideoMetadata[],
  batchSize: number = 10
): Promise<VideoMetadata[]> {
  const videosNeedingEnrichment = videos.filter(v => !v.viewCount || !v.publishedAt)

  if (videosNeedingEnrichment.length === 0) {
    return videos
  }

  logger.info('Enriching videos with metadata', {
    totalVideos: videos.length,
    videosNeedingEnrichment: videosNeedingEnrichment.length,
  })

  const enrichedVideos = [...videos]

  for (let i = 0; i < videosNeedingEnrichment.length; i += batchSize) {
    const batch = videosNeedingEnrichment.slice(i, i + batchSize)

    const metadataPromises = batch.map(async (video) => {
      const metadata = await fetchVideoMetadata(video.url)
      return { video, metadata }
    })

    const results = await Promise.all(metadataPromises)

    const videoIndexMap = new Map<string, number>()
    enrichedVideos.forEach((v, idx) => videoIndexMap.set(v.id, idx))

    results.forEach(({ video, metadata }) => {
      const index = videoIndexMap.get(video.id)
      if (index !== undefined && metadata) {
        const updates: Partial<VideoMetadata> = {}

        if (!enrichedVideos[index].viewCount && metadata.viewCount !== undefined) {
          updates.viewCount = metadata.viewCount
        }

        if (!enrichedVideos[index].publishedAt && metadata.uploadDate) {
          const formattedDate = formatUploadDate(metadata.uploadDate)
          if (formattedDate) {
            updates.publishedAt = formattedDate
          }
        }

        if (Object.keys(updates).length > 0) {
          enrichedVideos[index] = { ...enrichedVideos[index], ...updates }
        }
      }
    })

    if (i + batchSize < videosNeedingEnrichment.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return enrichedVideos
}
