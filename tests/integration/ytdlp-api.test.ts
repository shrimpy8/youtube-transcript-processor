import { describe, it, expect, beforeAll } from 'vitest'
import { parseSrtFile } from '@/lib/srt-parser'

/**
 * Integration tests for yt-dlp API routes
 * Note: These tests require yt-dlp binary to be available
 * They are skipped by default and should be run manually with actual YouTube URLs
 */

describe('yt-dlp API Integration', () => {
  describe('SRT Parser Integration', () => {
    it('should parse real SRT content', () => {
      const realSrtContent = `1
00:00:00,000 --> 00:00:02,000
Welcome to the show

2
00:00:02,500 --> 00:00:05,000
Today we have a special guest

3
00:00:05,500 --> 00:00:08,000
Let's get started`

      const segments = parseSrtFile(realSrtContent)
      
      expect(segments).toHaveLength(3)
      expect(segments[0].text).toBe('Welcome to the show')
      expect(segments[0].start).toBe(0)
      expect(segments[0].duration).toBe(2)
      
      expect(segments[1].text).toBe('Today we have a special guest')
      expect(segments[1].start).toBe(2.5)
      expect(segments[1].duration).toBe(2.5)
    })
  })

  // Note: Full API integration tests would require:
  // 1. Running Next.js dev server
  // 2. yt-dlp binary installed
  // 3. Actual YouTube video URLs
  // These should be added as E2E tests instead
})

