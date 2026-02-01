import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchTranscriptByUrlWithYtDlp } from '../api-client'
import {
  ErrorType,
} from '../errors'

// Mock fetch globally
global.fetch = vi.fn()

/** Helper: create a mock Response with both .json() and .text() */
function mockFetchResponse(body: unknown, init: { ok: boolean; status?: number }) {
  const jsonStr = JSON.stringify(body)
  return {
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    json: async () => body,
    text: async () => jsonStr,
  } as Response
}

describe('api-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchTranscriptByUrlWithYtDlp', () => {
    it('fetches transcript successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          videoId: 'abc123',
          segments: [
            { text: 'Hello', start: 0, duration: 2 },
            { text: 'World', start: 2, duration: 2 },
          ],
          segmentCount: 2,
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(mockResponse, { ok: true }))

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')

      expect(result.success).toBe(true)
      expect(result.data?.videoId).toBe('abc123')
      expect(result.data?.segments).toHaveLength(2)
      expect(fetch).toHaveBeenCalledWith('/api/transcript/ytdlp', expect.objectContaining({
        body: JSON.stringify({ url: 'https://youtube.com/watch?v=abc123' }),
      }))
    })

    it('handles 404 with NO_TRANSCRIPT type', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(
        { error: 'Transcript not available', type: ErrorType.NO_TRANSCRIPT },
        { ok: false, status: 404 }
      ))

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')
      expect(result.success).toBe(false)
      expect(result.type).toBe(ErrorType.NO_TRANSCRIPT)
    })

    it('handles VideoNotFoundError for 404 without NO_TRANSCRIPT type', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(
        { error: 'Video not found', type: ErrorType.VIDEO_NOT_FOUND },
        { ok: false, status: 404 }
      ))

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')
      expect(result.success).toBe(false)
      expect(result.type).toBe(ErrorType.VIDEO_NOT_FOUND)
    })

    it('handles RateLimitError for 429', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(
        { error: 'Rate limit exceeded', type: ErrorType.RATE_LIMIT },
        { ok: false, status: 429 }
      ))

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')
      expect(result.success).toBe(false)
      expect(result.type).toBe(ErrorType.RATE_LIMIT)
    })

    it('handles NetworkError for 503', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(
        { error: 'Network error', type: ErrorType.NETWORK_ERROR },
        { ok: false, status: 503 }
      ))

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')
      expect(result.success).toBe(false)
      expect(result.type).toBe(ErrorType.NETWORK_ERROR)
    })

    it('handles fetch failures', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')
      expect(result.success).toBe(false)
      expect(result.type).toBe(ErrorType.NETWORK_ERROR)
    })
  })
})
