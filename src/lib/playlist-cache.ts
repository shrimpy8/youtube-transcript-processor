import { DiscoverResponse } from './api-client'

/**
 * Cache entry structure for playlist data
 */
interface PlaylistCacheEntry {
  data: NonNullable<DiscoverResponse['data']>
  timestamp: number
  ttl: number // Time to live in milliseconds
}

/**
 * Session-based cache for playlist information
 * Clears on page refresh (in-memory only)
 */
class PlaylistCache {
  private cache: Map<string, PlaylistCacheEntry> = new Map()
  private readonly defaultTtl: number = 5 * 60 * 1000 // 5 minutes default

  /**
   * Get cached playlist data for a playlist URL
   * @param playlistUrl - YouTube playlist URL
   * @returns Cached data if valid, null if expired or not found
   */
  get(playlistUrl: string): NonNullable<DiscoverResponse['data']> | null {
    const entry = this.cache.get(playlistUrl)
    
    if (!entry) {
      return null
    }

    // Check if cache entry is expired
    const now = Date.now()
    const age = now - entry.timestamp
    
    if (age > entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(playlistUrl)
      return null
    }

    return entry.data
  }

  /**
   * Set cached playlist data for a playlist URL
   * @param playlistUrl - YouTube playlist URL
   * @param data - Playlist data to cache
   * @param ttl - Optional custom TTL in milliseconds (default: 5 minutes)
   */
  set(
    playlistUrl: string,
    data: NonNullable<DiscoverResponse['data']>,
    ttl?: number
  ): void {
    const entry: PlaylistCacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    }
    
    this.cache.set(playlistUrl, entry)
  }

  /**
   * Check if cache has valid entry for a playlist URL
   * @param playlistUrl - YouTube playlist URL
   * @returns true if valid cache exists, false otherwise
   */
  has(playlistUrl: string): boolean {
    return this.get(playlistUrl) !== null
  }

  /**
   * Remove cached entry for a playlist URL
   * @param playlistUrl - YouTube playlist URL
   */
  delete(playlistUrl: string): void {
    this.cache.delete(playlistUrl)
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear expired entries (useful for periodic cleanup)
   */
  clearExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      if (age > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache size (number of entries)
   */
  size(): number {
    return this.cache.size
  }
}

// Singleton instance for session-based caching
export const playlistCache = new PlaylistCache()

// Optional: Clean up expired entries every 10 minutes (client-side only)
if (typeof window !== 'undefined') {
  setInterval(() => {
    playlistCache.clearExpired()
  }, 10 * 60 * 1000) // 10 minutes
}

