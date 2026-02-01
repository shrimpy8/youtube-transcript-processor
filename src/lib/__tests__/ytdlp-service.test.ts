import { describe, it, expect } from 'vitest'
import { extractVideoIdFromUrl } from '../ytdlp-service'

// Note: Full integration tests for ytdlp-service would require actual yt-dlp binary
// These tests focus on utility functions that don't require the binary

describe('ytdlp-service', () => {
  describe('extractVideoIdFromUrl', () => {
    it('should extract video ID from standard YouTube URL', () => {
      expect(extractVideoIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(extractVideoIdFromUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should extract video ID from youtu.be URL', () => {
      expect(extractVideoIdFromUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(extractVideoIdFromUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should extract video ID from embed URL', () => {
      expect(extractVideoIdFromUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should extract video ID from URL with additional parameters', () => {
      expect(extractVideoIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe('dQw4w9WgXcQ')
      expect(extractVideoIdFromUrl('https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should return null for invalid URLs', () => {
      expect(extractVideoIdFromUrl('not-a-url')).toBeNull()
      expect(extractVideoIdFromUrl('https://example.com')).toBeNull()
      expect(extractVideoIdFromUrl('')).toBeNull()
    })

    it('should return null for channel/playlist URLs', () => {
      expect(extractVideoIdFromUrl('https://www.youtube.com/channel/UCtest')).toBeNull()
      expect(extractVideoIdFromUrl('https://www.youtube.com/playlist?list=PLtest')).toBeNull()
    })
  })
})

