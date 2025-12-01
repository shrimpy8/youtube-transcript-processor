/**
 * Accessibility utilities for WCAG compliance and screen reader support
 */

/**
 * Generate ARIA label from text content
 * @param text - Text to convert to ARIA label
 * @returns ARIA label string
 */
export function generateAriaLabel(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * Generate unique ID for ARIA attributes
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
let idCounter = 0
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`
}

/**
 * Check if element is focusable
 * @param element - Element to check
 * @returns True if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  // Check if element is disabled first (disabled elements are not focusable)
  if (element.hasAttribute('disabled') || (element as HTMLButtonElement | HTMLInputElement).disabled) {
    return false
  }

  // Check explicit tabIndex
  if (element.tabIndex >= 0) {
    return true
  }

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ]

  return focusableSelectors.some((selector) => element.matches(selector))
}

/**
 * Get all focusable elements within a container
 * @param container - Container element
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
}

/**
 * Trap focus within a container (for modals, dialogs)
 * @param container - Container element
 * @param firstFocusable - First focusable element (optional)
 * @param lastFocusable - Last focusable element (optional)
 * @returns Cleanup function
 */
export function trapFocus(
  container: HTMLElement,
  firstFocusable?: HTMLElement,
  lastFocusable?: HTMLElement
): () => void {
  const focusableElements = getFocusableElements(container)
  const first = firstFocusable || focusableElements[0]
  const last = lastFocusable || focusableElements[focusableElements.length - 1]

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') {
      return
    }

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      }
    } else {
      // Tab
      if (document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleTabKey)

  // Focus first element
  first?.focus()

  return () => {
    container.removeEventListener('keydown', handleTabKey)
  }
}

/**
 * Announce message to screen readers
 * @param message - Message to announce
 * @param priority - Priority level ('polite' or 'assertive')
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof window === 'undefined') {
    return
  }

  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Check if user prefers reduced motion
 * @returns True if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get skip link HTML
 * @param href - Link target
 * @param text - Link text
 * @returns Skip link element
 */
export function createSkipLink(href: string, text: string = 'Skip to main content'): HTMLElement {
  const link = document.createElement('a')
  link.href = href
  link.textContent = text
  link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md'
  return link
}

/**
 * Check color contrast ratio
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @returns Contrast ratio
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hexToRgb(hex)
    if (!rgb) return 0

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      val = val / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  const lum1 = getLuminance(foreground)
  const lum2 = getLuminance(background)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @param level - WCAG level ('AA' or 'AAA')
 * @param size - Text size ('normal' or 'large')
 * @returns True if contrast meets standards
 */
export function meetsContrastStandards(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background)

  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7
  }

  // AA level
  return size === 'large' ? ratio >= 3 : ratio >= 4.5
}

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Save current focus
   */
  saveFocus(): HTMLElement | null {
    return document.activeElement as HTMLElement
  },

  /**
   * Restore focus to element
   */
  restoreFocus(element: HTMLElement | null): void {
    if (element && isFocusable(element)) {
      element.focus()
    }
  },

  /**
   * Focus first element in container
   */
  focusFirst(container: HTMLElement): void {
    const focusable = getFocusableElements(container)
    focusable[0]?.focus()
  },

  /**
   * Focus last element in container
   */
  focusLast(container: HTMLElement): void {
    const focusable = getFocusableElements(container)
    focusable[focusable.length - 1]?.focus()
  },
}

