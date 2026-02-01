import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  exportTranscriptToFormat,
  generateFilename,
  createDownloadBlob,
  triggerDownload,
  exportAndDownload,
} from '../export-utils'
import { ProcessedTranscript } from '@/types'

const mockTranscript: ProcessedTranscript = {
  segments: [
    { text: 'Hello world', start: 0, duration: 2 },
    { text: 'This is a test', start: 2, duration: 3 },
  ],
  speakers: ['Host'],
  totalDuration: 5,
  wordCount: 4,
}

describe('export-utils', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  describe('exportTranscriptToFormat', () => {
    it('should export transcript as TXT', () => {
      const result = exportTranscriptToFormat(mockTranscript, 'txt')
      expect(result).toContain('Hello world')
      expect(result).toContain('This is a test')
    })

    it('should include metadata by default', () => {
      const result = exportTranscriptToFormat(mockTranscript, 'txt')
      expect(result).toContain('Total Duration')
      expect(result).toContain('Word Count')
    })

    it('should exclude metadata when option is false', () => {
      const result = exportTranscriptToFormat(mockTranscript, 'txt', {
        includeMetadata: false,
      })
      expect(result).not.toContain('Total Duration')
    })

    it('should throw error for unsupported formats', () => {
      expect(() => {
        exportTranscriptToFormat(mockTranscript, 'json' as unknown as Parameters<typeof exportTranscriptToFormat>[1])
      }).toThrow('Format json is not yet supported')
    })
  })

  describe('generateFilename', () => {
    it('should generate filename with video title', () => {
      const filename = generateFilename('Test Video Title', 'txt')
      expect(filename).toContain('test_video_title')
      expect(filename).toContain('.txt')
    })

    it('should generate filename without title', () => {
      const filename = generateFilename(undefined, 'txt')
      expect(filename).toContain('transcript')
      expect(filename).toContain('.txt')
    })

    it('should sanitize special characters', () => {
      const filename = generateFilename('Test/Video:Title!@#', 'txt')
      expect(filename).not.toContain('/')
      expect(filename).not.toContain(':')
      expect(filename).not.toContain('!')
    })

    it('should include date in filename', () => {
      const filename = generateFilename('Test', 'txt')
      const datePattern = /\d{4}-\d{2}-\d{2}/
      expect(filename).toMatch(datePattern)
    })
  })

  describe('createDownloadBlob', () => {
    it('should create blob with text content', () => {
      const blob = createDownloadBlob('test content', 'text/plain')
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/plain')
    })

    it('should use default MIME type', () => {
      const blob = createDownloadBlob('test content')
      expect(blob.type).toBe('text/plain')
    })
  })

  describe('triggerDownload', () => {
    it('should trigger download', () => {
      const blob = new Blob(['test'], { type: 'text/plain' })
      const link = document.createElement('a')
      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')
      const clickSpy = vi.spyOn(link, 'click')

      // Mock createElement to return our link
      vi.spyOn(document, 'createElement').mockReturnValue(link as unknown as HTMLElement)

      triggerDownload(blob, 'test.txt')

      expect(appendChildSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    })
  })

  describe('exportAndDownload', () => {
    it('should export and download transcript', async () => {
      const link = document.createElement('a')
      vi.spyOn(document, 'createElement').mockReturnValue(link as unknown as HTMLElement)
      vi.spyOn(link, 'click')

      await exportAndDownload(mockTranscript, 'txt', {}, 'Test Video')

      expect(link.download).toContain('test_video')
      expect(link.download).toContain('.txt')
      expect(link.click).toHaveBeenCalled()
    })
  })
})





