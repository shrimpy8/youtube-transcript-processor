import { VideoMetadata } from '@/types'
import { formatUploadDate } from './date-utils'

/**
 * Type for yt-dlp video info JSON output
 */
interface YtDlpVideoInfo {
  id?: string
  title?: string
  url?: string
  duration?: number
  thumbnail?: string
  channel?: string
  uploader?: string
  upload_date?: string
  channel_id?: string
  channel_url?: string
  view_count?: number
  [key: string]: unknown // Allow additional properties
}

/**
 * Transforms yt-dlp JSON output to VideoMetadata
 * @param info - yt-dlp JSON output
 * @returns VideoMetadata or null if invalid
 */
export function transformYtDlpVideoInfo(info: YtDlpVideoInfo): VideoMetadata | null {
  // Validate required fields
  if (!info.id || !info.title) {
    return null
  }
  
  // Build video URL if not provided
  const videoUrl = info.url || `https://www.youtube.com/watch?v=${info.id}`
  
  // Format upload_date from YYYYMMDD to YYYY-MM-DD if available
  const publishedAt = info.upload_date 
    ? formatUploadDate(info.upload_date)
    : undefined
  
  return {
    id: info.id,
    title: info.title,
    url: videoUrl,
    duration: info.duration || undefined,
    thumbnail: info.thumbnail || undefined,
    channelTitle: info.channel || info.uploader || undefined,
    publishedAt,
    viewCount: info.view_count || undefined,
  }
}

/**
 * Transforms array of yt-dlp JSON outputs to VideoMetadata array
 * Filters out invalid entries
 * @param infos - Array of yt-dlp JSON outputs
 * @returns Array of VideoMetadata
 */
export function transformYtDlpVideoInfoArray(infos: YtDlpVideoInfo[]): VideoMetadata[] {
  return infos
    .map(transformYtDlpVideoInfo)
    .filter((video): video is VideoMetadata => video !== null)
}

