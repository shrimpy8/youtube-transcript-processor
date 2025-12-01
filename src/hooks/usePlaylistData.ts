'use client'

import { discoverVideos, DiscoverResponse } from '@/lib/api-client'
import { playlistCache } from '@/lib/playlist-cache'
import { useCachedData } from './useCachedData'

interface UsePlaylistDataResult {
  playlist: DiscoverResponse['data'] | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching playlist data with session-based caching
 * Returns cached data immediately if available, otherwise fetches from API
 * 
 * @param playlistUrl - YouTube playlist URL
 * @returns Playlist data, loading state, error, and refetch function
 */
export function usePlaylistData(playlistUrl: string | null): UsePlaylistDataResult {
  const { data, isLoading, error, refetch } = useCachedData(
    playlistUrl,
    playlistCache,
    async (url: string) => {
      return await discoverVideos(url, 'playlist', 10)
    },
    'Failed to load playlist information'
  )

  return {
    playlist: data,
    isLoading,
    error,
    refetch,
  }
}

