import { discoverVideos, DiscoverResponse } from './api-client'
import { extractErrorMessage } from './utils'

/**
 * Helper functions for handling different URL types (channel, playlist, video)
 */

/**
 * Fetches channel information from a channel URL
 * @param url - YouTube channel URL
 * @returns Channel name or default name if fetch fails
 */
export async function fetchChannelName(url: string): Promise<string> {
  try {
    const response = await discoverVideos(url, 'channel', 1)
    if (response.success && response.data) {
      return response.data.title || 'Channel'
    }
    return 'Channel'
  } catch (error) {
    console.error('Failed to fetch channel info:', error)
    return 'Channel'
  }
}

/**
 * Fetches playlist information from a playlist URL
 * @param url - YouTube playlist URL
 * @returns Playlist name or default name if fetch fails
 */
export async function fetchPlaylistName(url: string): Promise<string> {
  try {
    const response = await discoverVideos(url, 'playlist', 1)
    if (response.success && response.data) {
      return response.data.title || 'Playlist'
    }
    return 'Playlist'
  } catch (error) {
    console.error('Failed to fetch playlist info:', error)
    return 'Playlist'
  }
}

