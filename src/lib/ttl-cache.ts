/**
 * Generic in-memory TTL cache.
 * Both channel-cache and playlist-cache use this instead of duplicating the logic.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class TtlCache<T> {
  private cache = new Map<string, CacheEntry<T>>()

  constructor(private readonly defaultTtl: number) {}

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }

  set(key: string, data: T, ttl?: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttl ?? this.defaultTtl })
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  clearExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) this.cache.delete(key)
    }
  }

  size(): number {
    return this.cache.size
  }
}
