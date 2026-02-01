/**
 * Mobile optimization utilities
 */

/**
 * Check if device is mobile
 * @returns True if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.innerWidth < 640 // Tailwind's sm breakpoint
}

/**
 * Check if device is tablet
 * @returns True if device is tablet
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.innerWidth >= 640 && window.innerWidth < 1024
}

/**
 * Check if device is desktop
 * @returns True if device is desktop
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.innerWidth >= 1024
}

/**
 * Get device type
 * @returns Device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}

/**
 * Check if device supports touch
 * @returns True if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
  )
}

/**
 * Get viewport dimensions
 * @returns Viewport width and height
 */
export function getViewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

/**
 * Check if viewport is in portrait orientation
 * @returns True if portrait
 */
export function isPortrait(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.innerHeight > window.innerWidth
}

/**
 * Check if viewport is in landscape orientation
 * @returns True if landscape
 */
export function isLandscape(): boolean {
  return !isPortrait()
}

/**
 * Get safe area insets (for devices with notches)
 * @returns Safe area insets
 */
export function getSafeAreaInsets(): {
  top: number
  right: number
  bottom: number
  left: number
} {
  if (typeof window === 'undefined' || !('CSS' in window)) {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }

  const style = getComputedStyle(document.documentElement)
  const getValue = (property: string): number => {
    const value = style.getPropertyValue(property)
    return value ? parseInt(value.replace('px', ''), 10) : 0
  }

  return {
    top: getValue('env(safe-area-inset-top)'),
    right: getValue('env(safe-area-inset-right)'),
    bottom: getValue('env(safe-area-inset-bottom)'),
    left: getValue('env(safe-area-inset-left)'),
  }
}

/**
 * Check if device has high DPI display
 * @returns True if high DPI
 */
export function isHighDPI(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.devicePixelRatio > 1
}

/**
 * Optimize image source for device
 * @param baseUrl - Base image URL
 * @param options - Optimization options
 * @returns Optimized image URL
 */
export function optimizeImageForDevice(
  baseUrl: string,
  options: {
    width?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpg' | 'png'
  } = {}
): string {
  const { width, format } = options

  // If no optimization needed, return original
  if (!width && !format) {
    return baseUrl
  }

  // For YouTube thumbnails, we can't optimize the URL structure
  // This is a placeholder for future optimization logic
  return baseUrl
}

/**
 * Prevent zoom on double tap (iOS Safari)
 * @param element - Element to prevent zoom on
 */
export function preventDoubleTapZoom(element: HTMLElement): () => void {
  let lastTouchEnd = 0

  const handleTouchEnd = (e: TouchEvent) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      e.preventDefault()
    }
    lastTouchEnd = now
  }

  element.addEventListener('touchend', handleTouchEnd, { passive: false })

  return () => {
    element.removeEventListener('touchend', handleTouchEnd)
  }
}

/**
 * Check if device is iOS
 * @returns True if iOS device
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * Check if device is Android
 * @returns True if Android device
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  return /Android/.test(navigator.userAgent)
}

