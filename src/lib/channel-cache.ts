import { ChannelInfoResponse } from './api-client'

/**
 * Cache entry structure for channel data
 */
interface ChannelCacheEntry {
  data: NonNullable<ChannelInfoResponse['data']>
  timestamp: number
  ttl: number // Time to live in milliseconds
}

/**
 * Session-based cache for channel information
 * Clears on page refresh (in-memory only)
 */
class ChannelCache {
  private cache: Map<string, ChannelCacheEntry> = new Map()
  private readonly defaultTtl: number = 5 * 60 * 1000 // 5 minutes default

  /**
   * Get cached channel data for a video URL
   * @param videoUrl - YouTube video URL
   * @returns Cached data if valid, null if expired or not found
   */
  get(videoUrl: string): NonNullable<ChannelInfoResponse['data']> | null {
    const entry = this.cache.get(videoUrl)
    
    if (!entry) {
      return null
    }

    // Check if cache entry is expired
    const now = Date.now()
    const age = now - entry.timestamp
    
    if (age > entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(videoUrl)
      return null
    }

    return entry.data
  }

  /**
   * Set cached channel data for a video URL
   * @param videoUrl - YouTube video URL
   * @param data - Channel data to cache
   * @param ttl - Optional custom TTL in milliseconds (default: 5 minutes)
   */
  set(
    videoUrl: string,
    data: NonNullable<ChannelInfoResponse['data']>,
    ttl?: number
  ): void {
    const entry: ChannelCacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    }
    
    this.cache.set(videoUrl, entry)
  }

  /**
   * Check if cache has valid entry for a video URL
   * @param videoUrl - YouTube video URL
   * @returns true if valid cache exists, false otherwise
   */
  has(videoUrl: string): boolean {
    return this.get(videoUrl) !== null
  }

  /**
   * Remove cached entry for a video URL
   * @param videoUrl - YouTube video URL
   */
  delete(videoUrl: string): void {
    this.cache.delete(videoUrl)
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
export const channelCache = new ChannelCache()

// Optional: Clean up expired entries every 10 minutes (client-side only)
if (typeof window !== 'undefined') {
  setInterval(() => {
    channelCache.clearExpired()
  }, 10 * 60 * 1000) // 10 minutes
}

