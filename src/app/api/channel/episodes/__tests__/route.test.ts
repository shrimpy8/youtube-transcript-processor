import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/ytdlp-service', () => ({
  getChannelVideos: vi.fn(),
}))

vi.mock('@/lib/youtube-validator', () => ({
  isValidYouTubeUrl: vi.fn(),
  getUrlType: vi.fn(),
}))

vi.mock('@/lib/url-utils', () => ({
  normalizeAndEncodeChannelUrl: vi.fn((url: string) => url),
}))

vi.mock('@/lib/rate-limiter', () => ({
  createRateLimiter: vi.fn(() => ({ check: vi.fn(() => true) })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn(() =>
    new Response(JSON.stringify({ success: false, error: 'Rate limited' }), { status: 429 })
  ),
  RATE_LIMIT_PRESETS: { standard: { maxRequests: 10, windowMs: 60000 } },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

import { POST } from '../route'
import { getChannelVideos } from '@/lib/ytdlp-service'
import { isValidYouTubeUrl, getUrlType } from '@/lib/youtube-validator'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/channel/episodes', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/channel/episodes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Input validation ---

  it('returns 400 when channelUrl is missing', async () => {
    const res = await POST(createRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/channel url is required/i)
    expect(json.type).toBe('MISSING_FIELD')
  })

  it('returns 400 when channelUrl is not a string', async () => {
    const res = await POST(createRequest({ channelUrl: 123 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.type).toBe('MISSING_FIELD')
  })

  it('returns 400 for invalid YouTube URL', async () => {
    vi.mocked(isValidYouTubeUrl).mockReturnValue(false)
    const res = await POST(createRequest({ channelUrl: 'https://example.com' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.type).toBe('INVALID_URL')
  })

  it('returns 400 for non-channel URL type (e.g. video)', async () => {
    vi.mocked(isValidYouTubeUrl).mockReturnValue(true)
    vi.mocked(getUrlType).mockReturnValue('video')
    const res = await POST(createRequest({ channelUrl: 'https://youtube.com/watch?v=abc' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.type).toBe('WRONG_URL_TYPE')
  })

  // --- Happy path ---

  it('returns episodes sorted by publishedAt descending', async () => {
    vi.mocked(isValidYouTubeUrl).mockReturnValue(true)
    vi.mocked(getUrlType).mockReturnValue('channel')
    vi.mocked(getChannelVideos).mockResolvedValue([
      { id: 'v1', title: 'Old Video', url: 'https://youtube.com/watch?v=v1', publishedAt: '2024-01-01T00:00:00Z', channelTitle: 'Test Channel' },
      { id: 'v2', title: 'New Video', url: 'https://youtube.com/watch?v=v2', publishedAt: '2024-06-01T00:00:00Z', channelTitle: 'Test Channel' },
      { id: 'v3', title: 'Mid Video', url: 'https://youtube.com/watch?v=v3', publishedAt: '2024-03-01T00:00:00Z', channelTitle: 'Test Channel' },
    ])

    const res = await POST(createRequest({
      channelUrl: 'https://youtube.com/@testchannel',
      maxEpisodes: 3,
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.episodes).toHaveLength(3)
    // Most recent first
    expect(json.data.episodes[0].videoId).toBe('v2')
    expect(json.data.episodes[1].videoId).toBe('v3')
    expect(json.data.episodes[2].videoId).toBe('v1')
  })

  it('extracts channel name from video data', async () => {
    vi.mocked(isValidYouTubeUrl).mockReturnValue(true)
    vi.mocked(getUrlType).mockReturnValue('channel')
    vi.mocked(getChannelVideos).mockResolvedValue([
      { id: 'v1', title: 'Video', url: 'https://youtube.com/watch?v=v1', channelTitle: 'My Podcast', publishedAt: '2024-01-01T00:00:00Z' },
    ])

    const res = await POST(createRequest({ channelUrl: 'https://youtube.com/@mypodcast' }))
    const json = await res.json()
    expect(json.data.channel.name).toBe('My Podcast')
  })

  it('falls back to URL handle when no channel title', async () => {
    vi.mocked(isValidYouTubeUrl).mockReturnValue(true)
    vi.mocked(getUrlType).mockReturnValue('channel')
    vi.mocked(getChannelVideos).mockResolvedValue([
      { id: 'v1', title: 'Video', url: 'https://youtube.com/watch?v=v1', publishedAt: '2024-01-01T00:00:00Z' },
    ])

    const res = await POST(createRequest({ channelUrl: 'https://youtube.com/@mypodcast' }))
    const json = await res.json()
    expect(json.data.channel.name).toBe('@mypodcast')
  })

  it('clamps maxEpisodes to 10', async () => {
    vi.mocked(isValidYouTubeUrl).mockReturnValue(true)
    vi.mocked(getUrlType).mockReturnValue('channel')
    vi.mocked(getChannelVideos).mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => ({
        id: `v${i}`,
        title: `Video ${i}`,
        url: `https://youtube.com/watch?v=v${i}`,
        publishedAt: new Date(2024, 0, i + 1).toISOString(),
      }))
    )

    const res = await POST(createRequest({
      channelUrl: 'https://youtube.com/@testchannel',
      maxEpisodes: 50,
    }))
    const json = await res.json()
    // Should be clamped to 10 max
    expect(json.data.episodes.length).toBeLessThanOrEqual(10)
  })

  // --- Error handling ---

  it('returns 404 when channel not found', async () => {
    vi.mocked(isValidYouTubeUrl).mockReturnValue(true)
    vi.mocked(getUrlType).mockReturnValue('channel')
    vi.mocked(getChannelVideos).mockRejectedValue(new Error('404 Not Found'))

    const res = await POST(createRequest({ channelUrl: 'https://youtube.com/@nonexistent' }))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.type).toBe('CHANNEL_NOT_FOUND')
  })

  it('returns 500 for unexpected errors', async () => {
    vi.mocked(isValidYouTubeUrl).mockReturnValue(true)
    vi.mocked(getUrlType).mockReturnValue('channel')
    vi.mocked(getChannelVideos).mockRejectedValue(new Error('Unexpected failure'))

    const res = await POST(createRequest({ channelUrl: 'https://youtube.com/@test' }))
    expect(res.status).toBe(500)
  })

  it('includes requestId in response', async () => {
    vi.mocked(isValidYouTubeUrl).mockReturnValue(true)
    vi.mocked(getUrlType).mockReturnValue('channel')
    vi.mocked(getChannelVideos).mockResolvedValue([
      { id: 'v1', title: 'Video', url: 'https://youtube.com/watch?v=v1', publishedAt: '2024-01-01T00:00:00Z' },
    ])

    const res = await POST(createRequest({ channelUrl: 'https://youtube.com/@test' }))
    const json = await res.json()
    expect(json.requestId).toBeDefined()
    expect(json.requestId).toMatch(/^req_/)
  })
})
