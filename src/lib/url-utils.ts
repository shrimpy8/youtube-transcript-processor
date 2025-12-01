/**
 * URL normalization and encoding utilities for YouTube URLs
 */

/**
 * Normalizes a video URL or ID to a full YouTube video URL
 * @param urlOrId - YouTube video URL or video ID
 * @returns Full YouTube video URL
 */
export function normalizeVideoUrl(urlOrId: string): string {
  if (urlOrId.startsWith('http')) {
    return urlOrId
  }
  return `https://www.youtube.com/watch?v=${urlOrId}`
}

/**
 * Normalizes a channel URL to a full YouTube channel URL
 * Supports @username, channel ID, or partial URLs
 * @param channelUrl - Channel URL in various formats
 * @returns Normalized channel URL (not yet encoded)
 */
export function normalizeChannelUrl(channelUrl: string): string {
  if (channelUrl.startsWith('http')) {
    return channelUrl
  }
  
  if (channelUrl.startsWith('@')) {
    return `https://www.youtube.com/${channelUrl}`
  }
  
  if (channelUrl.startsWith('UC') || channelUrl.startsWith('HC')) {
    return `https://www.youtube.com/channel/${channelUrl}`
  }
  
  return `https://www.youtube.com/@${channelUrl}`
}

/**
 * URL-encodes channel URL paths while preserving the @ symbol
 * Handles spaces and special characters in channel handles
 * @param url - Channel URL to encode
 * @returns URL-encoded channel URL
 */
export function encodeChannelUrlPath(url: string): string {
  try {
    const urlObj = new URL(url)
    // Split pathname and encode each segment, but preserve @ at the start
    const pathSegments = urlObj.pathname.split('/').filter(s => s)
    const encodedPath = '/' + pathSegments.map(segment => {
      // If segment starts with @, preserve it and encode the rest
      if (segment.startsWith('@')) {
        return '@' + encodeURIComponent(segment.substring(1))
      }
      return encodeURIComponent(segment)
    }).join('/')
    
    return `${urlObj.protocol}//${urlObj.host}${encodedPath}${urlObj.search}${urlObj.hash}`
  } catch {
    // If URL parsing fails, try basic encoding
    return encodeURI(url)
  }
}

/**
 * Normalizes and encodes a channel URL in one step
 * @param channelUrl - Channel URL in various formats
 * @returns Normalized and encoded channel URL
 */
export function normalizeAndEncodeChannelUrl(channelUrl: string): string {
  const normalized = normalizeChannelUrl(channelUrl)
  return encodeChannelUrlPath(normalized)
}

