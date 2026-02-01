import { VideoMetadata } from '@/types'
import { normalizeAndEncodeChannelUrl } from './url-utils'
import { mapYtDlpError } from './error-mapper'
import { transformYtDlpVideoInfoArray } from './video-metadata-utils'
import { createTimer } from './utils'
import { enrichVideosWithViewCounts } from './ytdlp-video-info'
import {
  ytdlpLogger as logger,
  getYtDlpInstance,
  extractOutputString,
  type YtDlpOutput,
  type YtDlpJsonInfo,
} from './ytdlp-core'

/**
 * Gets list of videos from a playlist
 * @param playlistUrl - YouTube playlist URL
 * @param maxVideos - Maximum number of videos to return (default: 100)
 * @param fetchViewCounts - Whether to fetch view counts for videos (default: true)
 * @returns Array of video metadata
 */
export async function getPlaylistVideos(
  playlistUrl: string,
  maxVideos: number = 100,
  fetchViewCounts: boolean = true
): Promise<VideoMetadata[]> {
  const timer = createTimer()
  timer.start()
  logger.info('Getting playlist videos', { playlistUrl, maxVideos, fetchViewCounts })

  const ytDlp = getYtDlpInstance()

  try {
    const args = [
      playlistUrl,
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--quiet',
      '--playlist-end', String(maxVideos),
    ]
    logger.debug('yt-dlp command args', { args })

    logger.info('Executing yt-dlp command for playlist')
    const output = await ytDlp.execPromise(args)
    const outputStr = extractOutputString(output as YtDlpOutput)
    const lines = outputStr.split('\n').filter(line => line.trim())
    logger.debug('Parsed yt-dlp output', { lineCount: lines.length, outputLength: outputStr.length })

    const videoInfos = lines
      .map(line => {
        try {
          return JSON.parse(line)
        } catch (parseError) {
          logger.debug('Skipping invalid JSON line', { line: line.substring(0, 100), error: parseError })
          return null
        }
      })
      .filter((info): info is YtDlpJsonInfo => info !== null)

    let videos = transformYtDlpVideoInfoArray(videoInfos)

    if (fetchViewCounts) {
      videos = await enrichVideosWithViewCounts(videos)
    }

    logger.info('Playlist videos retrieved successfully', {
      videoCount: videos.length,
      parseErrors: lines.length - videoInfos.length,
      videosWithViewCounts: videos.filter(v => v.viewCount).length,
      duration: timer.elapsedMs(),
    })

    if (lines.length - videoInfos.length > 0) {
      logger.warn('Some lines failed to parse', { parseErrors: lines.length - videoInfos.length, totalLines: lines.length })
    }

    return videos
  } catch (error) {
    logger.error('Failed to get playlist videos', error, {
      playlistUrl,
      maxVideos,
      duration: timer.elapsedMs(),
    })
    throw mapYtDlpError(error)
  }
}

/**
 * Gets list of videos from a channel
 * @param channelUrl - YouTube channel URL (supports @username, channel ID, or full URL)
 * @param maxVideos - Maximum number of videos to return (default: 100)
 * @param fetchViewCounts - Whether to fetch view counts for videos (default: true)
 * @returns Array of video metadata
 */
export async function getChannelVideos(
  channelUrl: string,
  maxVideos: number = 100,
  fetchViewCounts: boolean = true
): Promise<VideoMetadata[]> {
  const timer = createTimer()
  timer.start()
  logger.info('Getting channel videos', { channelUrl, maxVideos, fetchViewCounts })

  const normalizedUrl = normalizeAndEncodeChannelUrl(channelUrl)
  logger.debug('Normalized and encoded channel URL', { original: channelUrl, normalized: normalizedUrl })

  logger.debug('Delegating to getPlaylistVideos', { normalizedUrl, maxVideos, fetchViewCounts })
  return getPlaylistVideos(normalizedUrl, maxVideos, fetchViewCounts)
}
