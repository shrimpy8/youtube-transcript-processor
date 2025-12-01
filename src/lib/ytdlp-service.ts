import YTDlpWrap from 'yt-dlp-wrap'
import { VideoMetadata } from '@/types'
import { parseSrtContent } from './srt-parser'
import { TranscriptSegment } from '@/types'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { createLogger } from './logger'
import { normalizeAndEncodeChannelUrl, normalizeVideoUrl } from './url-utils'
import { mapYtDlpError } from './error-mapper'
import { transformYtDlpVideoInfoArray } from './video-metadata-utils'
import { createTimer } from './utils'
import { formatUploadDate } from './date-utils'

/**
 * yt-dlp service wrapper
 * Provides functions to interact with yt-dlp for transcript extraction
 */

// Initialize yt-dlp-wrap instance
// It will auto-download the binary on first use
let ytDlpWrapInstance: YTDlpWrap | null = null

/**
 * Logger instance for yt-dlp service
 */
const logger = createLogger('ytdlp-service')

/**
 * Get or create yt-dlp-wrap instance
 */
function getYtDlpInstance(): YTDlpWrap {
  if (!ytDlpWrapInstance) {
    ytDlpWrapInstance = new YTDlpWrap()
  }
  return ytDlpWrapInstance
}

/**
 * Options for downloading subtitles
 */
export interface SubtitleOptions {
  language?: string // Language code (e.g., 'en', 'en-US')
  format?: 'srt' | 'vtt' | 'ass' | 'best'
  writeAutoSubs?: boolean // Use auto-generated subtitles if manual not available
}

/**
 * Video information from yt-dlp
 */
export interface YtDlpVideoInfo {
  id: string
  title: string
  url: string
  duration?: number
  thumbnail?: string
  channel?: string
  description?: string
  upload_date?: string
}

/**
 * Type for yt-dlp execPromise output
 * Can be a string (stdout) or an object with stdout property
 */
type YtDlpOutput = string | { stdout: string }

/**
 * Helper to extract string output from yt-dlp execPromise result
 */
function extractOutputString(output: YtDlpOutput): string {
  if (typeof output === 'string') {
    return output
  }
  if (output && typeof output === 'object' && 'stdout' in output) {
    return output.stdout
  }
  return String(output)
}

/**
 * Type for parsed yt-dlp JSON info
 */
interface YtDlpJsonInfo {
  id?: string
  title?: string
  url?: string
  duration?: number
  thumbnail?: string
  channel?: string
  channel_id?: string
  channel_url?: string
  description?: string
  upload_date?: string
  view_count?: number
  [key: string]: unknown // Allow additional properties
}

/**
 * Downloads subtitles for a YouTube video
 * @param videoUrl - YouTube video URL or video ID
 * @param options - Subtitle download options
 * @returns Transcript segments parsed from SRT
 */
export async function downloadSubtitles(
  videoUrl: string,
  options: SubtitleOptions = {}
): Promise<TranscriptSegment[]> {
  const timer = createTimer()
  timer.start()
  logger.info('Starting subtitle download', { videoUrl, options })
  
  const ytDlp = getYtDlpInstance()
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ytdlp-'))
  logger.debug('Created temp directory', { tempDir })
  
  try {
    // Normalize video URL using utility
    const fullUrl = normalizeVideoUrl(videoUrl)

    // Extract video ID for filename
    const videoIdMatch = fullUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)
    const videoId = videoIdMatch ? videoIdMatch[1] : 'video'
    logger.debug('Extracted video ID', { videoId, fullUrl })

    // Build yt-dlp arguments
    const args: string[] = [
      fullUrl,
      '--write-auto-subs', // Use auto-generated subtitles
      '--skip-download', // Don't download video
      '--sub-lang', options.language || 'en',
      '--convert-subs', 'srt', // Convert to SRT format
      '--sub-format', options.format || 'srt',
      '-o', path.join(tempDir, `${videoId}.%(ext)s`),
      '--no-warnings',
      '--quiet',
    ]
    logger.debug('yt-dlp command args', { args })

    // Execute yt-dlp
    try {
      logger.info('Executing yt-dlp command')
      await ytDlp.execPromise(args)
      logger.debug('yt-dlp command completed successfully')
    } catch (error) {
      logger.warn('yt-dlp command threw error, checking for output files', { error })
      // yt-dlp may still succeed even if it throws (e.g., warnings)
      // Check if files were created
      const files = await fs.readdir(tempDir).catch(() => [])
      logger.debug('Files in temp directory', { files, count: files.length })
      if (files.length === 0) {
        logger.error('No files created after yt-dlp execution', error, { videoUrl, tempDir })
        throw error
      }
      logger.info('Files found despite error, continuing', { files })
    }

    // Find the downloaded subtitle file
    const possibleFiles = [
      path.join(tempDir, `${videoId}.srt`),
      path.join(tempDir, `${videoId}.en.srt`),
      path.join(tempDir, `${videoId}.${options.language || 'en'}.srt`),
    ]
    logger.debug('Checking for subtitle files', { possibleFiles })

    let srtFile: string | null = null
    for (const file of possibleFiles) {
      try {
        await fs.access(file)
        srtFile = file
        logger.debug('Found subtitle file', { srtFile })
        break
      } catch {
        // File doesn't exist, try next
        continue
      }
    }

    if (!srtFile) {
      // Try to find any .srt file in temp directory
      const files = await fs.readdir(tempDir)
      const srtFiles = files.filter(f => f.endsWith('.srt'))
      logger.debug('Searching for any .srt files', { files, srtFiles })
      if (srtFiles.length > 0) {
        srtFile = path.join(tempDir, srtFiles[0])
        logger.info('Found alternative subtitle file', { srtFile })
      }
    }

    if (!srtFile) {
      const files = await fs.readdir(tempDir).catch(() => [])
      logger.error('No subtitle file found', undefined, { 
        videoUrl, 
        tempDir, 
        files,
        possibleFiles,
      })
      throw new Error('No subtitle file found after download')
    }

    // Read and parse SRT file
    logger.info('Reading and parsing SRT file', { srtFile })
    const srtContent = await fs.readFile(srtFile)
    const segments = parseSrtContent(srtContent)
    logger.info('Parsed SRT file', { segmentCount: segments.length, srtFile })

    if (segments.length === 0) {
      logger.error('No transcript segments found in subtitle file', undefined, { srtFile })
      throw new Error('No transcript segments found in subtitle file')
    }

    logger.info('Subtitle download completed successfully', { 
      segmentCount: segments.length, 
      duration: timer.elapsedMs(),
    })
    return segments
  } catch (error) {
    logger.error('Subtitle download failed', error, { 
      videoUrl, 
      options,
      duration: timer.elapsedMs(),
    })
    
    // Extract video ID for error context
    const videoIdMatch = fullUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)
    const videoId = videoIdMatch ? videoIdMatch[1] : 'unknown'
    
    // Map yt-dlp errors using error mapper
    throw mapYtDlpError(error, { videoId })
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
      logger.debug('Cleaned up temp directory', { tempDir })
    } catch (cleanupError) {
      logger.warn('Failed to clean up temp directory', { tempDir, error: cleanupError })
      // Ignore cleanup errors
    }
  }
}

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
  
  // Normalize video URL using utility
  const fullUrl = normalizeVideoUrl(videoUrl)
  logger.debug('Normalized video URL', { original: videoUrl, normalized: fullUrl })

  try {
    const args = [
      fullUrl,
      '--dump-json',
      '--no-warnings',
      '--quiet',
      '--no-playlist', // Only get single video info
    ]
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

    const videoInfo = {
      id: info.id || '',
      title: info.title || 'Unknown',
      url: fullUrl,
      duration: info.duration || undefined,
      thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
      channel: info.channel || info.uploader,
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
    
    // Extract video ID for error context
    const videoIdMatch = fullUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)
    const videoId = videoIdMatch ? videoIdMatch[1] : 'unknown'
    
    // Map yt-dlp errors using error mapper
    throw mapYtDlpError(error, { videoId })
  }
}

/**
 * Fetches metadata for a single video (view count and upload date)
 * @param videoUrl - YouTube video URL or ID
 * @returns Object with view count and upload date, or undefined if unavailable
 */
async function fetchVideoMetadata(videoUrl: string): Promise<{ viewCount?: number; uploadDate?: string } | undefined> {
  try {
    const ytDlp = getYtDlpInstance()
    const fullUrl = normalizeVideoUrl(videoUrl)
    
    const args = [
      fullUrl,
      '--dump-json',
      '--no-warnings',
      '--quiet',
      '--no-playlist',
    ]
    
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
 * Optimized for faster parallel processing with larger batch sizes
 * @param videos - Array of videos to enrich
 * @param batchSize - Number of videos to fetch in parallel (default: 10, increased from 5)
 * @returns Array of videos with updated view counts and published dates
 */
async function enrichVideosWithViewCounts(
  videos: VideoMetadata[],
  batchSize: number = 10
): Promise<VideoMetadata[]> {
  // Early return: skip if no videos need enrichment
  const videosNeedingEnrichment = videos.filter(v => !v.viewCount || !v.publishedAt)
  
  if (videosNeedingEnrichment.length === 0) {
    return videos
  }
  
  logger.info('Enriching videos with metadata', { 
    totalVideos: videos.length,
    videosNeedingEnrichment: videosNeedingEnrichment.length 
  })
  
  // Process in batches to avoid overwhelming the system
  const enrichedVideos = [...videos]
  
  for (let i = 0; i < videosNeedingEnrichment.length; i += batchSize) {
    const batch = videosNeedingEnrichment.slice(i, i + batchSize)
    
    // Process batch in parallel
    const metadataPromises = batch.map(async (video) => {
      const metadata = await fetchVideoMetadata(video.url)
      return { video, metadata }
    })
    
    const results = await Promise.all(metadataPromises)
    
    // Update videos with metadata (optimized: use Map for O(1) lookup)
    const videoIndexMap = new Map<string, number>()
    enrichedVideos.forEach((v, idx) => videoIndexMap.set(v.id, idx))
    
    results.forEach(({ video, metadata }) => {
      const index = videoIndexMap.get(video.id)
      if (index !== undefined && metadata) {
        const updates: Partial<VideoMetadata> = {}
        
        // Update view count if missing and available
        if (!enrichedVideos[index].viewCount && metadata.viewCount !== undefined) {
          updates.viewCount = metadata.viewCount
        }
        
        // Update published date if missing and available
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
    
    // Reduced delay between batches (100ms instead of 200ms) for faster processing
    if (i + batchSize < videosNeedingEnrichment.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  return enrichedVideos
}

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
    
    // Parse all JSON lines and transform to VideoMetadata
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

    // Transform using utility function
    let videos = transformYtDlpVideoInfoArray(videoInfos)

    // Fetch view counts if requested and not available from flat-playlist
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
    
    // Map yt-dlp errors using error mapper
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
  
  // Normalize and encode channel URL using utility
  const normalizedUrl = normalizeAndEncodeChannelUrl(channelUrl)
  logger.debug('Normalized and encoded channel URL', { original: channelUrl, normalized: normalizedUrl })

  // Use the same logic as playlist (yt-dlp treats channels similarly)
  logger.debug('Delegating to getPlaylistVideos', { normalizedUrl, maxVideos, fetchViewCounts })
  return getPlaylistVideos(normalizedUrl, maxVideos, fetchViewCounts)
}

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

  // Normalize video URL using utility
  const fullUrl = normalizeVideoUrl(videoUrl)
  logger.debug('Normalized video URL', { original: videoUrl, normalized: fullUrl })

  try {
    const args = [
      fullUrl,
      '--dump-json',
      '--no-warnings',
      '--quiet',
      '--no-playlist',
    ]
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

    // yt-dlp provides channel information in the JSON output:
    // - channel: Channel name
    // - channel_id: Channel ID (e.g., UC...)
    // - channel_url: Direct channel URL (most reliable)
    // - uploader: Alternative channel name field
    // - uploader_id: Channel handle/username (may or may not include @)
    // - channel_follower_count: Subscriber count (if available)
    
    logger.debug('Extracted channel fields from yt-dlp output', {
      channel: info.channel,
      channel_id: info.channel_id,
      channel_url: info.channel_url,
      uploader: info.uploader,
      uploader_id: info.uploader_id,
    })
    
    // Extract channel information with fallbacks
    const channelName = info.channel || info.uploader || info.channel_name
    const channelId = info.channel_id || info.channelId
    const uploaderId = info.uploader_id // This is usually the channel handle
    
    logger.debug('Processed channel information', {
      channelName,
      channelId,
      uploaderId,
    })
    
    // Extract channel handle - uploader_id might be the handle
    let channelHandle: string | undefined
    if (uploaderId) {
      // uploader_id might already have @ or might not
      channelHandle = uploaderId.startsWith('@') ? uploaderId : `@${uploaderId}`
      logger.debug('Extracted channel handle', { uploaderId, channelHandle })
    }
    
    // Build channel URL - prioritize channel_url from yt-dlp (most reliable)
    let channelUrl = ''
    let urlSource = ''
    if (info.channel_url) {
      // Use yt-dlp's channel_url directly - it's the most reliable
      channelUrl = info.channel_url
      urlSource = 'channel_url'
    } else if (channelHandle && channelHandle.startsWith('@')) {
      // Construct from handle
      channelUrl = `https://www.youtube.com/${channelHandle}`
      urlSource = 'channelHandle'
    } else if (uploaderId && !uploaderId.startsWith('UC')) {
      // uploader_id might be a handle without @
      channelUrl = `https://www.youtube.com/@${uploaderId}`
      urlSource = 'uploaderId'
    } else if (channelId) {
      // Fallback to channel ID
      channelUrl = `https://www.youtube.com/channel/${channelId}`
      urlSource = 'channelId'
    } else {
      // Last resort: try to construct from channel name
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
    
    // Extract video ID for error context
    const videoIdMatch = fullUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)
    const videoId = videoIdMatch ? videoIdMatch[1] : 'unknown'
    
    // Map yt-dlp errors using error mapper
    throw mapYtDlpError(error, { videoId })
  }
}

/**
 * Extracts video ID from YouTube URL
 * @param url - YouTube URL
 * @returns Video ID or null
 */
export function extractVideoIdFromUrl(url: string): string | null {
  // Pattern 1: Standard YouTube URLs (youtube.com/watch?v=, youtu.be/, embed/)
  const standardPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  const standardMatch = url.match(standardPattern)
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1]
  }
  
  // Pattern 2: URLs with additional parameters (watch?feature=share&v=)
  const paramPattern = /youtube\.com\/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})/
  const paramMatch = url.match(paramPattern)
  if (paramMatch && paramMatch[1]) {
    return paramMatch[1]
  }
  
  return null
}

