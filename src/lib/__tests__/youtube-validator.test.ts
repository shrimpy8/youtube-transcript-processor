import { describe, it, expect } from 'vitest'
import {
  isValidYouTubeUrl,
  extractVideoId,
  extractChannelId,
  extractChannelUsername,
  extractPlaylistId,
  getUrlType,
  validateAndParseUrl,
} from '../youtube-validator'

describe('youtube-validator', () => {
  describe('isValidYouTubeUrl', () => {
    it('validates standard YouTube video URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
      expect(isValidYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
      expect(isValidYouTubeUrl('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
      expect(isValidYouTubeUrl('youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    })

    it('validates youtu.be short URLs', () => {
      expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
      expect(isValidYouTubeUrl('youtu.be/dQw4w9WgXcQ')).toBe(true)
    })

    it('validates channel URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw')).toBe(true)
      expect(isValidYouTubeUrl('https://www.youtube.com/@username')).toBe(true)
    })

    it('validates playlist URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMH7u86bJj6tVZx0XK')).toBe(true)
    })

    it('rejects invalid URLs', () => {
      expect(isValidYouTubeUrl('')).toBe(false)
      expect(isValidYouTubeUrl('not a url')).toBe(false)
      expect(isValidYouTubeUrl('https://vimeo.com/123456')).toBe(false)
      expect(isValidYouTubeUrl('https://example.com')).toBe(false)
    })
  })

  describe('extractVideoId', () => {
    it('extracts video ID from watch URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(extractVideoId('youtube.com/watch?v=abc123')).toBe('abc123')
    })

    it('extracts video ID from youtu.be URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(extractVideoId('youtu.be/abc123')).toBe('abc123')
    })

    it('extracts video ID from embed URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('returns null for invalid URLs', () => {
      expect(extractVideoId('')).toBe(null)
      expect(extractVideoId('not a url')).toBe(null)
      expect(extractVideoId('https://youtube.com/channel/UC123')).toBe(null)
    })
  })

  describe('extractChannelId', () => {
    it('extracts channel ID from channel URL', () => {
      expect(extractChannelId('https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw')).toBe('UC_x5XG1OV2P6uZZ5FSM9Ttw')
    })

    it('extracts channel ID from /c/ URL', () => {
      expect(extractChannelId('https://www.youtube.com/c/channelname')).toBe('channelname')
    })

    it('returns null for non-channel URLs', () => {
      expect(extractChannelId('https://youtube.com/watch?v=abc')).toBe(null)
    })
  })

  describe('extractChannelUsername', () => {
    it('extracts username from @ format', () => {
      expect(extractChannelUsername('https://www.youtube.com/@username')).toBe('username')
      expect(extractChannelUsername('youtube.com/@testuser')).toBe('testuser')
    })

    it('returns null for non-@ URLs', () => {
      expect(extractChannelUsername('https://youtube.com/channel/UC123')).toBe(null)
    })
  })

  describe('extractPlaylistId', () => {
    it('extracts playlist ID from URL', () => {
      expect(extractPlaylistId('https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMH7u86bJj6tVZx0XK')).toBe('PLrAXtmRdnEQy6nuLMH7u86bJj6tVZx0XK')
      expect(extractPlaylistId('https://youtube.com/watch?v=abc&list=PL123')).toBe('PL123')
    })

    it('returns null when no playlist ID', () => {
      expect(extractPlaylistId('https://youtube.com/watch?v=abc')).toBe(null)
    })
  })

  describe('getUrlType', () => {
    it('identifies video URLs', () => {
      expect(getUrlType('https://youtube.com/watch?v=abc')).toBe('video')
      expect(getUrlType('https://youtu.be/abc')).toBe('video')
      expect(getUrlType('https://youtube.com/embed/abc')).toBe('video')
    })

    it('identifies channel URLs', () => {
      expect(getUrlType('https://youtube.com/channel/UC123')).toBe('channel')
      expect(getUrlType('https://youtube.com/@username')).toBe('channel')
      expect(getUrlType('https://youtube.com/c/channelname')).toBe('channel')
    })

    it('identifies playlist URLs', () => {
      expect(getUrlType('https://youtube.com/playlist?list=PL123')).toBe('playlist')
      expect(getUrlType('https://youtube.com/watch?v=abc&list=PL123')).toBe('playlist')
    })

    it('returns null for invalid URLs', () => {
      expect(getUrlType('')).toBe(null)
      expect(getUrlType('not a url')).toBe(null)
    })
  })

  describe('validateAndParseUrl', () => {
    it('validates and parses video URL', () => {
      const result = validateAndParseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(result.isValid).toBe(true)
      expect(result.type).toBe('video')
      expect(result.videoId).toBe('dQw4w9WgXcQ')
    })

    it('validates and parses channel URL', () => {
      const result = validateAndParseUrl('https://www.youtube.com/@username')
      expect(result.isValid).toBe(true)
      expect(result.type).toBe('channel')
      expect(result.channelId).toBe('username')
    })

    it('validates and parses playlist URL', () => {
      const result = validateAndParseUrl('https://www.youtube.com/playlist?list=PL123')
      expect(result.isValid).toBe(true)
      expect(result.type).toBe('playlist')
      expect(result.playlistId).toBe('PL123')
    })

    it('returns error for empty URL', () => {
      const result = validateAndParseUrl('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('URL is required')
    })

    it('returns error for invalid URL format', () => {
      const result = validateAndParseUrl('not a youtube url')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid YouTube URL format')
    })

    it('handles URLs with extra query parameters', () => {
      const result = validateAndParseUrl('https://youtube.com/watch?v=abc&t=123&list=PL123')
      expect(result.isValid).toBe(true)
      expect(result.type).toBe('playlist')
      expect(result.videoId).toBe('abc')
      expect(result.playlistId).toBe('PL123')
    })
  })
})





