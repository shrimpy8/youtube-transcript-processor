import YTDlpWrap from 'yt-dlp-wrap'
import { createLogger } from './logger'
import { extractVideoId } from './youtube-validator'

/**
 * Shared yt-dlp infrastructure: singleton instance, types, and helpers.
 */

// Singleton yt-dlp-wrap instance (auto-downloads binary on first use)
let ytDlpWrapInstance: YTDlpWrap | null = null

export const ytdlpLogger = createLogger('ytdlp-service')

/** Common yt-dlp arguments for JSON metadata extraction */
export const YTDLP_JSON_ARGS = ['--dump-json', '--no-warnings', '--quiet', '--no-playlist'] as const

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
 */
export type YtDlpOutput = string | { stdout: string }

/**
 * Type for parsed yt-dlp JSON info
 */
export interface YtDlpJsonInfo {
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
  [key: string]: unknown
}

/**
 * Get or create the singleton yt-dlp-wrap instance
 */
export function getYtDlpInstance(): YTDlpWrap {
  if (!ytDlpWrapInstance) {
    ytDlpWrapInstance = new YTDlpWrap()
  }
  return ytDlpWrapInstance
}

/**
 * Extract string output from yt-dlp execPromise result
 */
export function extractOutputString(output: YtDlpOutput): string {
  if (typeof output === 'string') {
    return output
  }
  if (output && typeof output === 'object' && 'stdout' in output) {
    return output.stdout
  }
  return String(output)
}

// Re-export from youtube-validator as the single source of truth for video ID extraction
export { extractVideoId as extractVideoIdFromUrl } from './youtube-validator'

/**
 * Extract video ID from a URL, returning 'unknown' if not found
 */
export function extractVideoIdOrUnknown(url: string): string {
  return extractVideoId(url) || url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1] || 'unknown'
}
