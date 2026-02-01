import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/ytdlp-service', () => ({
  getChannelInfoFromVideo: vi.fn(),
  getChannelVideos: vi.fn(),
}))

vi.mock('@/lib/youtube-validator', () => ({
  validateAndParseUrl: vi.fn(),
}))

vi.mock('@/lib/error-mapper', () => ({
  mapYtDlpError: vi.fn((err: unknown) => err),
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
import { getChannelInfoFromVideo, getChannelVideos } from '@/lib/ytdlp-service'
import { validateAndParseUrl } from '@/lib/youtube-validator'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/channel', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/channel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Input validation ---

  it('returns 400 when videoUrl is missing', async () => {
    const res = await POST(createRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/video url is required/i)
  })

  it('returns 400 for invalid YouTube video URL', async () => {
    vi.mocked(validateAndParseUrl).mockReturnValue({
      isValid: false,
      type: null,
      videoId: null,
      error: 'Not a valid URL',
    })
    const res = await POST(createRequest({ videoUrl: 'https://example.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-video URL type', async () => {
    vi.mocked(validateAndParseUrl).mockReturnValue({
      isValid: true,
      type: 'channel',
      videoId: null,
    })
    const res = await POST(createRequest({ videoUrl: 'https://youtube.com/@test' }))
    expect(res.status).toBe(400)
  })

  // --- Happy path ---

  it('returns channel info and top videos sorted by view count', async () => {
    vi.mocked(validateAndParseUrl).mockReturnValue({
      isValid: true,
      type: 'video',
      videoId: 'abc12345678',
    })
    vi.mocked(getChannelInfoFromVideo).mockResolvedValue({
      channelUrl: 'https://youtube.com/@testchannel',
      channelId: 'UC12345',
      channelName: 'Test Channel',
      channelHandle: '@testchannel',
    })
    vi.mocked(getChannelVideos).mockResolvedValue([
      { id: 'v1', title: 'Video 1', url: 'https://youtube.com/watch?v=v1', viewCount: 100 },
      { id: 'v2', title: 'Video 2', url: 'https://youtube.com/watch?v=v2', viewCount: 500 },
      { id: 'v3', title: 'Video 3', url: 'https://youtube.com/watch?v=v3', viewCount: 200 },
    ])

    const res = await POST(createRequest({ videoUrl: 'https://youtube.com/watch?v=abc12345678' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.channel.name).toBe('Test Channel')
    expect(json.data.channel.id).toBe('UC12345')
    expect(json.data.videos).toHaveLength(3)
    // Should be sorted by view count descending
    expect(json.data.videos[0].id).toBe('v2')
    expect(json.data.videos[0].viewCount).toBe(500)
    expect(json.data.videos[0].rank).toBe(1)
  })

  it('returns channel info with empty videos when video fetch fails', async () => {
    vi.mocked(validateAndParseUrl).mockReturnValue({
      isValid: true,
      type: 'video',
      videoId: 'abc12345678',
    })
    vi.mocked(getChannelInfoFromVideo).mockResolvedValue({
      channelUrl: 'https://youtube.com/@testchannel',
      channelId: 'UC12345',
      channelName: 'Test Channel',
    })
    vi.mocked(getChannelVideos).mockRejectedValue(new Error('404 Not Found'))

    const res = await POST(createRequest({ videoUrl: 'https://youtube.com/watch?v=abc12345678' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.channel.name).toBe('Test Channel')
    expect(json.data.videos).toHaveLength(0)
  })

  it('handles getChannelInfoFromVideo failure', async () => {
    vi.mocked(validateAndParseUrl).mockReturnValue({
      isValid: true,
      type: 'video',
      videoId: 'abc12345678',
    })
    vi.mocked(getChannelInfoFromVideo).mockRejectedValue(new Error('yt-dlp failed'))

    const res = await POST(createRequest({ videoUrl: 'https://youtube.com/watch?v=abc12345678' }))
    expect(res.status).toBe(500)
  })

  it('includes requestId in response', async () => {
    vi.mocked(validateAndParseUrl).mockReturnValue({
      isValid: true,
      type: 'video',
      videoId: 'abc12345678',
    })
    vi.mocked(getChannelInfoFromVideo).mockResolvedValue({
      channelUrl: 'https://youtube.com/@test',
      channelId: 'UC12345',
      channelName: 'Test',
    })
    vi.mocked(getChannelVideos).mockResolvedValue([])

    const res = await POST(createRequest({ videoUrl: 'https://youtube.com/watch?v=abc12345678' }))
    const json = await res.json()
    expect(json.requestId).toBeDefined()
    expect(json.requestId).toMatch(/^req_/)
  })
})
