import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  readChannels,
  writeChannels,
  readEpisodeCache,
  writeEpisodeCache,
  isCacheValid,
  readAutoFetch,
  writeAutoFetch,
  clearChannelCache,
  updateChannelCache,
} from '../favorite-channels-storage'
import { FavoriteChannel } from '@/types'
import { STORAGE_KEYS } from '../constants'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('readChannels / writeChannels', () => {
  const channel: FavoriteChannel = {
    id: 'ch-1',
    url: 'https://youtube.com/@test',
    name: 'Test Channel',
    addedAt: '2026-01-31T00:00:00Z',
    lastFetchedAt: null,
  }

  it('returns [] when nothing stored', () => {
    expect(readChannels()).toEqual([])
  })

  it('round-trips channels', () => {
    writeChannels([channel])
    expect(readChannels()).toEqual([channel])
  })

  it('returns [] for corrupt JSON', () => {
    localStorageMock.setItem(STORAGE_KEYS.FAVORITE_CHANNELS, 'not-json')
    expect(readChannels()).toEqual([])
  })

  it('filters out invalid entries', () => {
    localStorageMock.setItem(
      STORAGE_KEYS.FAVORITE_CHANNELS,
      JSON.stringify([channel, { bad: true }, 42])
    )
    expect(readChannels()).toEqual([channel])
  })

  it('returns false on QuotaExceededError', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })
    expect(writeChannels([channel])).toBe(false)
  })
})

describe('readEpisodeCache / writeEpisodeCache', () => {
  it('returns {} when nothing stored', () => {
    expect(readEpisodeCache()).toEqual({})
  })

  it('round-trips cache', () => {
    const cache = {
      'ch-1': {
        episodes: [],
        fetchedAt: '2026-01-31T00:00:00Z',
      },
    }
    writeEpisodeCache(cache)
    expect(readEpisodeCache()).toEqual(cache)
  })

  it('returns {} for invalid data', () => {
    localStorageMock.setItem(STORAGE_KEYS.FAVORITE_CHANNELS_EPISODES_CACHE, '"string"')
    expect(readEpisodeCache()).toEqual({})
  })
})

describe('isCacheValid', () => {
  it('returns false when no cache exists', () => {
    expect(isCacheValid('ch-1')).toBe(false)
  })

  it('returns true when cache is within TTL', () => {
    const cache = {
      'ch-1': {
        episodes: [],
        fetchedAt: new Date().toISOString(),
      },
    }
    writeEpisodeCache(cache)
    expect(isCacheValid('ch-1', 300_000)).toBe(true)
  })

  it('returns false when cache is expired', () => {
    const old = new Date(Date.now() - 600_000).toISOString()
    const cache = {
      'ch-1': {
        episodes: [],
        fetchedAt: old,
      },
    }
    writeEpisodeCache(cache)
    expect(isCacheValid('ch-1', 300_000)).toBe(false)
  })
})

describe('readAutoFetch / writeAutoFetch', () => {
  it('defaults to true', () => {
    expect(readAutoFetch()).toBe(true)
  })

  it('persists false', () => {
    writeAutoFetch(false)
    expect(readAutoFetch()).toBe(false)
  })

  it('persists true', () => {
    writeAutoFetch(true)
    expect(readAutoFetch()).toBe(true)
  })
})

describe('clearChannelCache', () => {
  it('removes a specific channel from cache', () => {
    const cache = {
      'ch-1': { episodes: [], fetchedAt: '2026-01-31T00:00:00Z' },
      'ch-2': { episodes: [], fetchedAt: '2026-01-31T00:00:00Z' },
    }
    writeEpisodeCache(cache)
    clearChannelCache('ch-1')
    const result = readEpisodeCache()
    expect(result['ch-1']).toBeUndefined()
    expect(result['ch-2']).toBeDefined()
  })
})

describe('updateChannelCache', () => {
  it('updates a specific channel in cache', () => {
    const entry = { episodes: [], fetchedAt: '2026-01-31T12:00:00Z' }
    updateChannelCache('ch-1', entry)
    const result = readEpisodeCache()
    expect(result['ch-1']).toEqual(entry)
  })
})
