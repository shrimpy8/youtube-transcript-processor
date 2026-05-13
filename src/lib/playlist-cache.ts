import { DiscoverResponse } from './api-client'
import { TtlCache } from './ttl-cache'

type PlaylistData = NonNullable<DiscoverResponse['data']>

/**
 * Session-based cache for playlist information (5-minute TTL, in-memory only).
 */
export const playlistCache = new TtlCache<PlaylistData>(5 * 60 * 1000)

// Periodic cleanup of expired entries (client-side only).
// Interval ID stored to prevent accumulation during HMR reloads.
let _playlistCleanupInterval: ReturnType<typeof setInterval> | null = null
if (typeof window !== 'undefined') {
  if (_playlistCleanupInterval !== null) clearInterval(_playlistCleanupInterval)
  _playlistCleanupInterval = setInterval(() => {
    playlistCache.clearExpired()
  }, 10 * 60 * 1000) // 10 minutes
}
