import { ChannelInfoResponse } from './api-client'
import { TtlCache } from './ttl-cache'

type ChannelData = NonNullable<ChannelInfoResponse['data']>

/**
 * Session-based cache for channel information (5-minute TTL, in-memory only).
 */
export const channelCache = new TtlCache<ChannelData>(5 * 60 * 1000)

// Periodic cleanup of expired entries (client-side only).
// Interval ID stored to prevent accumulation during HMR reloads.
let _channelCleanupInterval: ReturnType<typeof setInterval> | null = null
if (typeof window !== 'undefined') {
  if (_channelCleanupInterval !== null) clearInterval(_channelCleanupInterval)
  _channelCleanupInterval = setInterval(() => {
    channelCache.clearExpired()
  }, 10 * 60 * 1000) // 10 minutes
}
