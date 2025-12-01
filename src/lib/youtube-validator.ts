/**
 * YouTube URL validation and parsing utilities
 */

export type UrlType = 'video' | 'channel' | 'playlist' | null

export interface ValidationResult {
  isValid: boolean
  type: UrlType
  videoId: string | null
  channelId: string | null
  playlistId: string | null
  error?: string
}

/**
 * Validates if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
  return youtubeRegex.test(url.trim())
}

/**
 * Extracts video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*&v=([^&\n?#]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) return match[1]
  }
  
  return null
}

/**
 * Extracts channel ID from YouTube URL
 */
export function extractChannelId(url: string): string | null {
  if (!url || typeof url !== 'string') return null

  const patterns = [
    /youtube\.com\/channel\/([^&\n?#\/]+)/,
    /youtube\.com\/c\/([^&\n?#\/]+)/,
    /youtube\.com\/user\/([^&\n?#\/]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) return match[1]
  }
  
  return null
}

/**
 * Extracts channel username from YouTube URL (@username format)
 */
export function extractChannelUsername(url: string): string | null {
  if (!url || typeof url !== 'string') return null

  const match = url.match(/youtube\.com\/@([^&\n?#\/]+)/)
  return match && match[1] ? match[1] : null
}

/**
 * Extracts playlist ID from YouTube URL
 */
export function extractPlaylistId(url: string): string | null {
  if (!url || typeof url !== 'string') return null

  const match = url.match(/[?&]list=([^&\n?#]+)/)
  return match && match[1] ? match[1] : null
}

/**
 * Detects the type of YouTube URL (video, channel, or playlist)
 */
export function getUrlType(url: string): UrlType {
  if (!url || typeof url !== 'string') return null

  const trimmedUrl = url.trim()
  
  // Check for playlist
  if (trimmedUrl.includes('list=')) {
    return 'playlist'
  }
  
  // Check for channel
  if (
    trimmedUrl.includes('/channel/') ||
    trimmedUrl.includes('/c/') ||
    trimmedUrl.includes('/user/') ||
    trimmedUrl.includes('/@')
  ) {
    return 'channel'
  }
  
  // Check for video
  if (
    trimmedUrl.includes('/watch?v=') ||
    trimmedUrl.includes('youtu.be/') ||
    trimmedUrl.includes('/embed/')
  ) {
    return 'video'
  }
  
  return null
}

/**
 * Validates and parses a YouTube URL
 */
export function validateAndParseUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      isValid: false,
      type: null,
      videoId: null,
      channelId: null,
      playlistId: null,
      error: 'URL is required',
    }
  }

  const trimmedUrl = url.trim()

  // Check if it's a valid YouTube URL format
  if (!isValidYouTubeUrl(trimmedUrl)) {
    return {
      isValid: false,
      type: null,
      videoId: null,
      channelId: null,
      playlistId: null,
      error: 'Invalid YouTube URL format',
    }
  }

  const type = getUrlType(trimmedUrl)
  
  if (!type) {
    return {
      isValid: false,
      type: null,
      videoId: null,
      channelId: null,
      playlistId: null,
      error: 'Could not determine URL type',
    }
  }

  const videoId = extractVideoId(trimmedUrl)
  const channelId = extractChannelId(trimmedUrl)
  const channelUsername = extractChannelUsername(trimmedUrl)
  const playlistId = extractPlaylistId(trimmedUrl)

  // Validate based on type
  if (type === 'video' && !videoId) {
    return {
      isValid: false,
      type: 'video',
      videoId: null,
      channelId: null,
      playlistId: null,
      error: 'Video ID not found in URL',
    }
  }

  if (type === 'channel' && !channelId && !channelUsername) {
    return {
      isValid: false,
      type: 'channel',
      videoId: null,
      channelId: null,
      playlistId: null,
      error: 'Channel ID or username not found in URL',
    }
  }

  if (type === 'playlist' && !playlistId) {
    return {
      isValid: false,
      type: 'playlist',
      videoId: null,
      channelId: null,
      playlistId: null,
      error: 'Playlist ID not found in URL',
    }
  }

  return {
    isValid: true,
    type,
    videoId,
    channelId: channelId || channelUsername,
    playlistId,
  }
}





