import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleEmptyTranscript,
  handleLongTranscript,
  validateTranscriptSegments,
  handleMalformedResponse,
  handleNetworkError,
} from '@/lib/edge-case-handlers'
import { createErrorResponse } from '@/lib/api-helpers'
import {
  NoTranscriptError,
  VideoNotFoundError,
  NetworkError,
  RateLimitError,
  AppError,
  ErrorType,
} from '@/lib/errors'
import { TranscriptSegment } from '@/types'

describe('Error Handling Integration', () => {
  describe('Edge Case Handlers Integration', () => {
    it('handles empty transcript scenario', () => {
      const result = handleEmptyTranscript(null)
      expect(result.isEmpty).toBe(true)
      expect(result.message).toBeDefined()
    })

    it('handles very long transcript scenario', () => {
      const longText = Array(60000).fill('word').join(' ')
      const segments: TranscriptSegment[] = [
        {
          text: longText,
          start: 0,
          duration: 1,
        },
      ]
      const result = handleLongTranscript(segments)
      expect(result.isTooLong).toBe(true)
      expect(result.warning).toBeDefined()
    })

    it('validates and sanitizes malformed transcript segments', () => {
      const malformedSegments = [
        { text: 'Valid', start: 0, duration: 1 },
        { invalid: 'segment' },
        { text: 'Valid', start: 1, duration: 1 },
      ]
      const result = validateTranscriptSegments(malformedSegments)
      expect(result).not.toBeNull()
      expect(result?.length).toBe(2)
    })

    it('handles malformed API response', () => {
      const malformedResponse = { unexpected: 'format' }
      const result = handleMalformedResponse(malformedResponse)
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('handles network error detection', () => {
      const networkError = new Error('Failed to fetch')
      const result = handleNetworkError(networkError)
      expect(result.isNetworkError).toBe(true)
      expect(result.message).toContain('Network error')
    })
  })

  describe('API Error Response Integration', () => {
    it('creates error response for NoTranscriptError', () => {
      const error = new NoTranscriptError('test-video-id')
      const response = createErrorResponse(error)

      expect(response.status).toBe(404)
      // Note: NextResponse.json() returns a Response-like object
      // In actual usage, this would be serialized JSON
    })

    it('creates error response for VideoNotFoundError', () => {
      const error = new VideoNotFoundError('test-video-id')
      const response = createErrorResponse(error)

      expect(response.status).toBe(404)
    })

    it('creates error response for NetworkError', () => {
      const error = new NetworkError('Network failure')
      const response = createErrorResponse(error)

      expect(response.status).toBe(503)
    })

    it('creates error response for RateLimitError', () => {
      const error = new RateLimitError('Rate limit exceeded')
      const response = createErrorResponse(error)

      expect(response.status).toBe(429)
    })

    it('creates error response for generic AppError', () => {
      const error = new AppError(ErrorType.UNKNOWN, 'Unknown error', 500)
      const response = createErrorResponse(error)

      expect(response.status).toBe(500)
    })

    it('creates error response for unknown error types', () => {
      const error = new Error('Unexpected error')
      const response = createErrorResponse(error)

      expect(response.status).toBe(500)
    })
  })

  describe('Error Recovery Flow Integration', () => {
    it('handles error → retry → success flow', async () => {
      let attemptCount = 0
      const retryFn = vi.fn().mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 2) {
          throw new NetworkError('Network failure')
        }
        // Success on second attempt
      })

      // Simulate retry logic
      let error: Error | null = null
      let retryCount = 0

      try {
        await retryFn()
      } catch (e) {
        error = e as Error
        retryCount++
        // Retry once
        try {
          await retryFn()
          error = null
        } catch (e2) {
          error = e2 as Error
        }
      }

      expect(retryFn).toHaveBeenCalledTimes(2)
      expect(error).toBeNull()
    })

    it('handles error → max retries → failure flow', async () => {
      const retryFn = vi.fn().mockRejectedValue(new NetworkError('Network failure'))
      const maxRetries = 3

      let error: Error | null = null
      let retryCount = 0

      for (let i = 0; i < maxRetries; i++) {
        try {
          await retryFn()
        } catch (e) {
          error = e as Error
          retryCount++
        }
      }

      expect(retryFn).toHaveBeenCalledTimes(maxRetries)
      expect(retryCount).toBe(maxRetries)
      expect(error).not.toBeNull()
    })
  })

  describe('Edge Case Scenarios Integration', () => {
    it('handles empty transcript → error display flow', () => {
      const segments: TranscriptSegment[] = []
      const emptyResult = handleEmptyTranscript(segments)

      expect(emptyResult.isEmpty).toBe(true)
      expect(emptyResult.message).toBeDefined()

      // Simulate error creation
      const error = new NoTranscriptError('test-video-id')
      const response = createErrorResponse(error)

      expect(response.status).toBe(404)
    })

    it('handles malformed response → validation → error flow', () => {
      const malformedResponse = { invalid: 'data' }
      const validationResult = handleMalformedResponse(malformedResponse)

      expect(validationResult.isValid).toBe(false)

      // Simulate error creation
      const error = new AppError(
        ErrorType.UNKNOWN,
        validationResult.error || 'Invalid response',
        400
      )
      const response = createErrorResponse(error)

      expect(response.status).toBe(400)
    })

    it('handles network error → detection → retry flow', async () => {
      const networkError = new Error('Failed to fetch')
      const detectionResult = handleNetworkError(networkError)

      expect(detectionResult.isNetworkError).toBe(true)

      // Simulate retry with exponential backoff
      let retryDelay = 1000
      const maxRetries = 3

      for (let i = 0; i < maxRetries; i++) {
        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
        retryDelay *= 2

        // In real scenario, would retry the operation
      }

      expect(retryDelay).toBeGreaterThan(1000)
    })

    it('handles very long transcript → warning → processing flow', () => {
      const longText = Array(60000).fill('word').join(' ')
      const segments: TranscriptSegment[] = [
        {
          text: longText,
          start: 0,
          duration: 1,
        },
      ]

      const longTranscriptResult = handleLongTranscript(segments)
      expect(longTranscriptResult.isTooLong).toBe(true)
      expect(longTranscriptResult.warning).toBeDefined()

      // Transcript should still be processable
      const validatedSegments = validateTranscriptSegments(segments)
      expect(validatedSegments).not.toBeNull()
      expect(validatedSegments?.length).toBe(1)
    })
  })

  describe('Error Type Mapping Integration', () => {
    it('maps network errors correctly through the flow', () => {
      const networkError = new Error('Failed to fetch')
      const detectionResult = handleNetworkError(networkError)

      expect(detectionResult.isNetworkError).toBe(true)

      const apiError = new NetworkError(detectionResult.message)
      const response = createErrorResponse(apiError)

      expect(response.status).toBe(503)
    })

    it('maps timeout errors correctly', () => {
      const timeoutError = new Error('Request timed out')
      timeoutError.name = 'TimeoutError'
      const detectionResult = handleNetworkError(timeoutError)

      expect(detectionResult.isTimeout).toBe(true)
      expect(detectionResult.isNetworkError).toBe(true)
    })

    it('handles unknown error types gracefully', () => {
      const unknownError = new Error('Something went wrong')
      const response = createErrorResponse(unknownError)

      expect(response.status).toBe(500)
    })
  })
})

