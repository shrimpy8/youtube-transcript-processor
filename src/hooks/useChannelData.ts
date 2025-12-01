'use client'

import { useCallback } from 'react'
import { fetchChannelInfoFromVideo, discoverVideos, ChannelInfoResponse } from '@/lib/api-client'
import { channelCache } from '@/lib/channel-cache'
import { ChannelDetails } from '@/types'
import { useCachedData } from './useCachedData'

interface UseChannelDataResult {
  channel: ChannelInfoResponse['data'] | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching channel data with session-based caching
 * Returns cached data immediately if available, otherwise fetches from API
 * 
 * @param url - YouTube video URL or channel URL
 * @param urlType - Type of URL: 'video' (derive channel) or 'channel' (direct channel URL)
 * @returns Channel data, loading state, error, and refetch function
 */
export function useChannelData(url: string | null, urlType: 'video' | 'channel' = 'video'): UseChannelDataResult {
  const fetchChannelData = useCallback(async (url: string): Promise<ChannelInfoResponse> => {
    if (urlType === 'channel') {
      // For direct channel URLs, use discoverVideos API
      const discoverResponse = await discoverVideos(url, 'channel', 10)
      
      if (discoverResponse.success && discoverResponse.data) {
        // Transform DiscoverResponse to ChannelInfoResponse format
        const channelDetails: ChannelDetails = {
          id: discoverResponse.data.id,
          name: discoverResponse.data.title,
          url: discoverResponse.data.url,
          videoCount: discoverResponse.data.videoCount,
        }
        
        // Sort videos by view count and take top 10
        const sortedVideos = [...discoverResponse.data.videos]
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 10)
          .map((video, index) => ({
            ...video,
            rank: index + 1
          }))

        return {
          success: true,
          data: {
            channel: channelDetails,
            videos: sortedVideos,
          },
        }
      } else {
        return {
          success: false,
          error: discoverResponse.error || 'Failed to load channel information',
        }
      }
    } else {
      // For video URLs, use existing fetchChannelInfoFromVideo
      return await fetchChannelInfoFromVideo(url)
    }
  }, [urlType])

  const { data, isLoading, error, refetch } = useCachedData(
    url,
    channelCache,
    fetchChannelData,
    'Failed to load channel information'
  )

  return {
    channel: data,
    isLoading,
    error,
    refetch,
  }
}

