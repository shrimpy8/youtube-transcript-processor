/**
 * localStorage storage utility for the Favorite Channels feature.
 * All reads are defensive (try/catch with safe defaults).
 * All writes catch QuotaExceededError and return boolean success.
 */

import { FavoriteChannel, EpisodeCache, EpisodeCacheEntry } from '@/types'
import { STORAGE_KEYS, EPISODE_CACHE_TTL_MS } from './constants'

/**
 * Reads and validates the favorite channels list.
 * Returns [] if key missing, invalid, or parse fails.
 */
export function readChannels(): FavoriteChannel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_CHANNELS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Basic shape validation
    return parsed.filter(
      (ch: unknown): ch is FavoriteChannel =>
        typeof ch === 'object' &&
        ch !== null &&
        typeof (ch as FavoriteChannel).id === 'string' &&
        typeof (ch as FavoriteChannel).url === 'string'
    )
  } catch {
    return []
  }
}

/**
 * Writes the favorite channels list to localStorage.
 * Returns false if QuotaExceededError.
 */
export function writeChannels(channels: FavoriteChannel[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITE_CHANNELS, JSON.stringify(channels))
    return true
  } catch {
    return false
  }
}

/**
 * Reads the episode cache.
 * Returns {} if missing or invalid.
 */
export function readEpisodeCache(): EpisodeCache {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_CHANNELS_EPISODES_CACHE)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return parsed as EpisodeCache
  } catch {
    return {}
  }
}

/**
 * Writes the episode cache. Returns false on quota error.
 */
export function writeEpisodeCache(cache: EpisodeCache): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITE_CHANNELS_EPISODES_CACHE, JSON.stringify(cache))
    return true
  } catch {
    return false
  }
}

/**
 * Checks if cached episodes for channelId are within TTL.
 * Returns false if no cache entry or expired.
 */
export function isCacheValid(channelId: string, ttlMs: number = EPISODE_CACHE_TTL_MS): boolean {
  const cache = readEpisodeCache()
  const entry = cache[channelId]
  if (!entry || !entry.fetchedAt) return false
  const fetchedAt = new Date(entry.fetchedAt).getTime()
  if (isNaN(fetchedAt)) return false
  return Date.now() - fetchedAt < ttlMs
}

/**
 * Reads auto-fetch setting. Default: true.
 */
export function readAutoFetch(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_CHANNELS_AUTO_FETCH)
    if (raw === null) return true
    return JSON.parse(raw) === true
  } catch {
    return true
  }
}

/**
 * Writes auto-fetch setting.
 */
export function writeAutoFetch(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITE_CHANNELS_AUTO_FETCH, JSON.stringify(enabled))
  } catch {
    // Silently fail — non-critical setting
  }
}

/**
 * Removes a single channel's entries from episode cache.
 */
export function clearChannelCache(channelId: string): void {
  const cache = readEpisodeCache()
  delete cache[channelId]
  writeEpisodeCache(cache)
}

/**
 * Updates the cache for a specific channel.
 */
export function updateChannelCache(channelId: string, entry: EpisodeCacheEntry): boolean {
  const cache = readEpisodeCache()
  cache[channelId] = entry
  return writeEpisodeCache(cache)
}
