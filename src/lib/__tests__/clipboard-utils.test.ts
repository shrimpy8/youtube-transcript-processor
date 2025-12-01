import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { copyToClipboard, getSelectedText } from '../clipboard-utils'

describe('clipboard-utils', () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    global.navigator.clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    } as any

    // Mock document.execCommand
    document.execCommand = vi.fn().mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('copyToClipboard', () => {
    it('should copy text using clipboard API', async () => {
      const text = 'Test text'
      await copyToClipboard(text)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text)
    })

    it('should fallback to execCommand if clipboard API fails', async () => {
      // Mock clipboard API to fail
      global.navigator.clipboard = undefined as any

      const text = 'Test text'
      await copyToClipboard(text)

      expect(document.execCommand).toHaveBeenCalledWith('copy')
    })

    it('should handle clipboard API errors', async () => {
      // Mock clipboard API to throw error
      global.navigator.clipboard = {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
      } as any

      const text = 'Test text'
      await expect(copyToClipboard(text)).resolves.not.toThrow()
      expect(document.execCommand).toHaveBeenCalledWith('copy')
    })
  })

  describe('getSelectedText', () => {
    it('should return selected text', () => {
      const mockSelection = {
        toString: () => 'selected text',
      }
      window.getSelection = vi.fn().mockReturnValue(mockSelection as any)

      const result = getSelectedText()
      expect(result).toBe('selected text')
    })

    it('should return null if no selection', () => {
      window.getSelection = vi.fn().mockReturnValue(null)

      const result = getSelectedText()
      expect(result).toBeNull()
    })

    it('should return null if selection is empty', () => {
      const mockSelection = {
        toString: () => '',
      }
      window.getSelection = vi.fn().mockReturnValue(mockSelection as any)

      const result = getSelectedText()
      expect(result).toBeNull()
    })
  })
})





