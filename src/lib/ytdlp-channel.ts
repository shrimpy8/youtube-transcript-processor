import { normalizeVideoUrl } from './url-utils'
import { mapYtDlpError } from './error-mapper'
import { createTimer } from './utils'
import {
  ytdlpLogger as logger,
  getYtDlpInstance,
  extractOutputString,
  extractVideoIdOrUnknown,
  YTDLP_JSON_ARGS,
  type YtDlpOutput,
  type YtDlpJsonInfo,
} from './ytdlp-core'

/**
 * Gets channel information from a video URL
 * Extracts channel details and returns channel URL for fetching videos
 * @param videoUrl - YouTube video URL
 * @returns Channel information including URL and metadata
 */
export async function getChannelInfoFromVideo(videoUrl: string): Promise<{
  channelUrl: string
  channelId?: string
  channelName?: string
  channelHandle?: string
}> {
  const timer = createTimer()
  timer.start()
  logger.info('Getting channel info from video', { videoUrl })

  const ytDlp = getYtDlpInstance()
  const fullUrl = normalizeVideoUrl(videoUrl)
  logger.debug('Normalized video URL', { original: videoUrl, normalized: fullUrl })

  try {
    const args = [fullUrl, ...YTDLP_JSON_ARGS]
    logger.debug('yt-dlp command args', { args })

    logger.info('Executing yt-dlp command for channel info')
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

    logger.debug('Extracted channel fields from yt-dlp output', {
      channel: info.channel,
      channel_id: info.channel_id,
      channel_url: info.channel_url,
      uploader: info.uploader,
      uploader_id: info.uploader_id,
    })

    const channelName = (info.channel || info.uploader || info.channel_name) as string | undefined
    const channelId = (info.channel_id || info.channelId) as string | undefined
    const uploaderId = info.uploader_id as string | undefined

    logger.debug('Processed channel information', {
      channelName,
      channelId,
      uploaderId,
    })

    let channelHandle: string | undefined
    if (uploaderId) {
      channelHandle = uploaderId.startsWith('@') ? uploaderId : `@${uploaderId}`
      logger.debug('Extracted channel handle', { uploaderId, channelHandle })
    }

    // Build channel URL — prioritize channel_url from yt-dlp (most reliable)
    let channelUrl = ''
    let urlSource = ''
    if (info.channel_url) {
      channelUrl = info.channel_url
      urlSource = 'channel_url'
    } else if (channelHandle && channelHandle.startsWith('@')) {
      channelUrl = `https://www.youtube.com/${channelHandle}`
      urlSource = 'channelHandle'
    } else if (uploaderId && !uploaderId.startsWith('UC')) {
      channelUrl = `https://www.youtube.com/@${uploaderId}`
      urlSource = 'uploaderId'
    } else if (channelId) {
      channelUrl = `https://www.youtube.com/channel/${channelId}`
      urlSource = 'channelId'
    } else {
      if (channelName) {
        const sanitized = channelName.toLowerCase().replace(/[^a-z0-9]/g, '')
        channelUrl = `https://www.youtube.com/@${sanitized}`
        urlSource = 'channelName (sanitized)'
      } else {
        logger.error('Could not determine channel URL from video', undefined, {
          videoUrl,
          info: {
            channel: info.channel,
            channel_id: info.channel_id,
            channel_url: info.channel_url,
            uploader: info.uploader,
            uploader_id: info.uploader_id,
          },
        })
        throw new Error('Could not determine channel URL from video - missing all channel identifiers')
      }
    }

    logger.debug('Built channel URL', { channelUrl, urlSource })

    const result = {
      channelUrl,
      channelId,
      channelName,
      channelHandle: channelHandle?.startsWith('@') ? channelHandle : channelHandle ? `@${channelHandle}` : undefined,
    }

    logger.info('Channel info retrieved successfully', {
      channelUrl: result.channelUrl,
      channelName: result.channelName,
      channelId: result.channelId,
      urlSource,
      duration: timer.elapsedMs(),
    })

    return result
  } catch (error) {
    logger.error('Failed to get channel info from video', error, {
      videoUrl,
      fullUrl,
      duration: timer.elapsedMs(),
    })
    const videoId = extractVideoIdOrUnknown(fullUrl)
    throw mapYtDlpError(error, { videoId })
  }
}
