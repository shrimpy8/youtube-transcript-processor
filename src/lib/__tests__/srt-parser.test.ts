import { describe, it, expect } from 'vitest'
import { parseSrtFile, parseSrtTime, cleanSrtText, parseSrtContent } from '../srt-parser'

describe('srt-parser', () => {
  describe('parseSrtTime', () => {
    it('should parse SRT timestamp with milliseconds', () => {
      expect(parseSrtTime('00:01:23,456')).toBe(83.456)
      expect(parseSrtTime('01:30:45,789')).toBe(5445.789)
    })

    it('should parse SRT timestamp with dot separator', () => {
      expect(parseSrtTime('00:01:23.456')).toBe(83.456)
    })

    it('should parse timestamp without milliseconds', () => {
      expect(parseSrtTime('00:01:23')).toBe(83)
    })

    it('should return 0 for invalid timestamp', () => {
      expect(parseSrtTime('invalid')).toBe(0)
    })
  })

  describe('cleanSrtText', () => {
    it('should remove HTML tags', () => {
      expect(cleanSrtText('Hello <b>world</b>')).toBe('Hello world')
    })

    it('should remove brackets content', () => {
      expect(cleanSrtText('Hello [music] world')).toBe('Hello world')
    })

    it('should remove parentheses content', () => {
      expect(cleanSrtText('Hello (laughs) world')).toBe('Hello world')
    })

    it('should normalize whitespace', () => {
      expect(cleanSrtText('Hello    world')).toBe('Hello world')
    })
  })

  describe('parseSrtFile', () => {
    it('should parse valid SRT content', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello world

2
00:00:04,000 --> 00:00:06,000
This is a test`

      const segments = parseSrtFile(srtContent)
      expect(segments).toHaveLength(2)
      expect(segments[0]).toMatchObject({
        text: 'Hello world',
        start: 1,
        duration: 2,
      })
      expect(segments[1]).toMatchObject({
        text: 'This is a test',
        start: 4,
        duration: 2,
      })
    })

    it('should handle multi-line subtitles', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello
world
test`

      const segments = parseSrtFile(srtContent)
      expect(segments).toHaveLength(1)
      expect(segments[0].text).toBe('Hello world test')
    })

    it('should skip invalid blocks', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Valid text

Invalid block without timestamp`

      const segments = parseSrtFile(srtContent)
      expect(segments).toHaveLength(1)
    })

    it('should return empty array for empty content', () => {
      expect(parseSrtFile('')).toEqual([])
      expect(parseSrtFile('   ')).toEqual([])
    })
  })

  describe('parseSrtContent', () => {
    it('should parse string content', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello world`

      const segments = parseSrtContent(srtContent)
      expect(segments).toHaveLength(1)
    })

    it('should parse Buffer content', () => {
      const srtContent = Buffer.from(`1
00:00:01,000 --> 00:00:03,000
Hello world`, 'utf-8')

      const segments = parseSrtContent(srtContent)
      expect(segments).toHaveLength(1)
    })
  })
})

