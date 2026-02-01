import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  generateAriaLabel,
  generateAriaId,
  isFocusable,
  getFocusableElements,
  trapFocus,
  announceToScreenReader,
  prefersReducedMotion,
  createSkipLink,
  getContrastRatio,
  meetsContrastStandards,
  focusManagement,
} from '../accessibility-utils'

describe('accessibility-utils', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('generateAriaLabel', () => {
    it('trims and normalizes whitespace', () => {
      expect(generateAriaLabel('  hello   world  ')).toBe('hello world')
    })

    it('handles multiple spaces', () => {
      expect(generateAriaLabel('hello    world')).toBe('hello world')
    })
  })

  describe('generateAriaId', () => {
    it('generates unique IDs', () => {
      const id1 = generateAriaId('test')
      const id2 = generateAriaId('test')
      expect(id1).not.toBe(id2)
    })

    it('includes prefix', () => {
      const id = generateAriaId('test')
      expect(id).toContain('test')
    })
  })

  describe('isFocusable', () => {
    it('returns true for button', () => {
      const button = document.createElement('button')
      expect(isFocusable(button)).toBe(true)
    })

    it('returns true for anchor with href', () => {
      const anchor = document.createElement('a')
      anchor.href = '#test'
      expect(isFocusable(anchor)).toBe(true)
    })

    it('returns false for disabled button', () => {
      const button = document.createElement('button')
      button.disabled = true
      expect(isFocusable(button)).toBe(false)
    })

    it('returns true for element with tabIndex >= 0', () => {
      const div = document.createElement('div')
      div.tabIndex = 0
      expect(isFocusable(div)).toBe(true)
    })
  })

  describe('getFocusableElements', () => {
    it('returns focusable elements', () => {
      const container = document.createElement('div')
      const button = document.createElement('button')
      const input = document.createElement('input')
      const div = document.createElement('div')

      container.appendChild(button)
      container.appendChild(input)
      container.appendChild(div)

      const focusable = getFocusableElements(container)
      expect(focusable).toContain(button)
      expect(focusable).toContain(input)
      expect(focusable).not.toContain(div)
    })
  })

  describe('trapFocus', () => {
    it('traps focus within container', () => {
      const container = document.createElement('div')
      const button1 = document.createElement('button')
      const button2 = document.createElement('button')
      button1.textContent = 'Button 1'
      button2.textContent = 'Button 2'

      container.appendChild(button1)
      container.appendChild(button2)
      document.body.appendChild(container)

      const cleanup = trapFocus(container)

      // Focus should be on first element
      expect(document.activeElement).toBe(button1)

      cleanup()
    })

    it('returns cleanup function', () => {
      const container = document.createElement('div')
      const cleanup = trapFocus(container)
      expect(typeof cleanup).toBe('function')
      cleanup()
    })
  })

  describe('announceToScreenReader', () => {
    it('creates announcement element', () => {
      announceToScreenReader('Test message')
      const announcement = document.querySelector('[role="status"]')
      expect(announcement).toBeTruthy()
      expect(announcement?.textContent).toBe('Test message')
    })

    it('sets correct aria-live attribute', () => {
      announceToScreenReader('Test', 'assertive')
      const announcement = document.querySelector('[aria-live="assertive"]')
      expect(announcement).toBeTruthy()
    })
  })

  describe('prefersReducedMotion', () => {
    it('returns boolean', () => {
      const result = prefersReducedMotion()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('createSkipLink', () => {
    it('creates skip link element', () => {
      const link = createSkipLink('#main', 'Skip to content')
      expect(link.tagName).toBe('A')
      expect((link as HTMLAnchorElement).href).toContain('#main')
      expect(link.textContent).toBe('Skip to content')
    })
  })

  describe('getContrastRatio', () => {
    it('calculates contrast ratio', () => {
      const ratio = getContrastRatio('#000000', '#ffffff')
      expect(ratio).toBeGreaterThan(20) // Black on white has high contrast
    })

    it('handles invalid colors', () => {
      const ratio = getContrastRatio('invalid', '#ffffff')
      expect(ratio).toBeGreaterThanOrEqual(0)
    })
  })

  describe('meetsContrastStandards', () => {
    it('checks AA standard for normal text', () => {
      const meets = meetsContrastStandards('#000000', '#ffffff', 'AA', 'normal')
      expect(meets).toBe(true)
    })

    it('checks AAA standard for large text', () => {
      const meets = meetsContrastStandards('#000000', '#ffffff', 'AAA', 'large')
      expect(meets).toBe(true)
    })
  })

  describe('focusManagement', () => {
    it('saves and restores focus', () => {
      const button = document.createElement('button')
      document.body.appendChild(button)
      button.focus()

      const saved = focusManagement.saveFocus()
      expect(saved).toBe(button)

      const newButton = document.createElement('button')
      document.body.appendChild(newButton)
      newButton.focus()

      focusManagement.restoreFocus(saved)
      expect(document.activeElement).toBe(button)
    })

    it('focuses first element', () => {
      const container = document.createElement('div')
      const button1 = document.createElement('button')
      const button2 = document.createElement('button')
      container.appendChild(button1)
      container.appendChild(button2)
      document.body.appendChild(container)

      focusManagement.focusFirst(container)
      expect(document.activeElement).toBe(button1)
    })

    it('focuses last element', () => {
      const container = document.createElement('div')
      const button1 = document.createElement('button')
      const button2 = document.createElement('button')
      container.appendChild(button1)
      container.appendChild(button2)
      document.body.appendChild(container)

      focusManagement.focusLast(container)
      expect(document.activeElement).toBe(button2)
    })
  })
})

