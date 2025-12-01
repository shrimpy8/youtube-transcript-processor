import { describe, it, expect } from 'vitest'
import {
  AppError,
  NoTranscriptError,
  VideoNotFoundError,
  NetworkError,
  RateLimitError,
  ErrorType,
} from '../errors'

describe('errors', () => {
  describe('AppError', () => {
    it('creates error with type and message', () => {
      const error = new AppError(ErrorType.UNKNOWN, 'Test error', 500)
      
      expect(error.type).toBe(ErrorType.UNKNOWN)
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('AppError')
    })
  })

  describe('NoTranscriptError', () => {
    it('creates error with video ID', () => {
      const error = new NoTranscriptError('abc123')
      
      expect(error.type).toBe(ErrorType.NO_TRANSCRIPT)
      expect(error.message).toContain('abc123')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('VideoNotFoundError', () => {
    it('creates error with video ID', () => {
      const error = new VideoNotFoundError('abc123')
      
      expect(error.type).toBe(ErrorType.VIDEO_NOT_FOUND)
      expect(error.message).toContain('abc123')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('NetworkError', () => {
    it('creates error with default message', () => {
      const error = new NetworkError()
      
      expect(error.type).toBe(ErrorType.NETWORK_ERROR)
      expect(error.message).toBe('Network request failed')
      expect(error.statusCode).toBe(503)
    })

    it('creates error with custom message', () => {
      const error = new NetworkError('Custom network error')
      
      expect(error.message).toBe('Custom network error')
    })
  })

  describe('RateLimitError', () => {
    it('creates error with default message', () => {
      const error = new RateLimitError()
      
      expect(error.type).toBe(ErrorType.RATE_LIMIT)
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.statusCode).toBe(429)
    })
  })
})





