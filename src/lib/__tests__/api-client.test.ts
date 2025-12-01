import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchTranscriptByUrlWithYtDlp } from '../api-client'
import {
  NoTranscriptError,
  VideoNotFoundError,
  NetworkError,
  RateLimitError,
  ErrorType,
} from '../errors'

// Mock fetch globally
global.fetch = vi.fn()

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

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')

      expect(result.success).toBe(true)
      expect(result.data?.videoId).toBe('abc123')
      expect(result.data?.segments).toHaveLength(2)
      expect(fetch).toHaveBeenCalledWith('/api/transcript/ytdlp', expect.objectContaining({
        body: JSON.stringify({ url: 'https://youtube.com/watch?v=abc123' }),
      }))
    })

    it('handles 404 with NO_TRANSCRIPT type', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Transcript not available',
          type: ErrorType.NO_TRANSCRIPT,
        }),
      } as Response)

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')
      expect(result.success).toBe(false)
      expect(result.type).toBe(ErrorType.NO_TRANSCRIPT)
    })

    it('handles VideoNotFoundError for 404 without NO_TRANSCRIPT type', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Video not found',
          type: ErrorType.VIDEO_NOT_FOUND,
        }),
      } as Response)

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')
      expect(result.success).toBe(false)
      expect(result.type).toBe(ErrorType.VIDEO_NOT_FOUND)
    })

    it('handles RateLimitError for 429', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limit exceeded',
          type: ErrorType.RATE_LIMIT,
        }),
      } as Response)

      const result = await fetchTranscriptByUrlWithYtDlp('https://youtube.com/watch?v=abc123')
      expect(result.success).toBe(false)
      expect(result.type).toBe(ErrorType.RATE_LIMIT)
    })

    it('handles NetworkError for 503', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: 'Network error',
          type: ErrorType.NETWORK_ERROR,
        }),
      } as Response)

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



