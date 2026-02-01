/**
 * Performance utilities for optimization and monitoring
 */

/**
 * Debounce function to limit function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to limit function calls
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Lazy load images with intersection observer
 * @param imageElement - Image element to lazy load
 * @param src - Image source URL
 */
export function lazyLoadImage(
  imageElement: HTMLImageElement,
  src: string
): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          imageElement.src = src
          observer.unobserve(imageElement)
        }
      })
    },
    { rootMargin: '50px' }
  )

  observer.observe(imageElement)

  return () => {
    observer.unobserve(imageElement)
    observer.disconnect()
  }
}

/**
 * Measure performance of a function
 * @param name - Performance mark name
 * @param fn - Function to measure
 * @returns Function result and duration
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const startMark = `${name}-start`
  const endMark = `${name}-end`
  const measureName = `${name}-measure`

  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(startMark)
  }

  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  const duration = end - start

  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(endMark)
    try {
      performance.measure(measureName, startMark, endMark)
    } catch {
      // Measure might already exist, ignore
    }
  }

  return { result, duration }
}

/**
 * Check if code is running on client side
 */
export function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Check if code is running on server side
 */
export function isServer(): boolean {
  return typeof window === 'undefined'
}

/**
 * Get bundle size information (client-side only)
 */
export function getBundleSize(): {
  totalSize: number
  scripts: Array<{ src: string; size: number }>
} | null {
  if (!isClient()) {
    return null
  }

  const scripts = Array.from(document.querySelectorAll('script[src]'))
  const scriptSizes = scripts.map((script) => {
    const src = script.getAttribute('src') || ''
    // In a real implementation, you'd fetch and measure the actual size
    // For now, return placeholder
    return { src, size: 0 }
  })

  const totalSize = scriptSizes.reduce((sum, s) => sum + s.size, 0)

  return {
    totalSize,
    scripts: scriptSizes,
  }
}

/**
 * Preload a resource
 * @param href - Resource URL
 * @param as - Resource type (script, style, image, etc.)
 */
export function preloadResource(href: string, as: string): void {
  if (!isClient()) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as
  document.head.appendChild(link)
}

/**
 * Prefetch a resource
 * @param href - Resource URL
 */
export function prefetchResource(href: string): void {
  if (!isClient()) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (!isClient()) {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Request idle callback with fallback
 * @param callback - Callback to execute
 * @param options - Options for idle callback
 */
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if (!isClient()) {
    // Fallback: execute immediately on server
    callback()
    return 0
  }

  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options)
  }

  // Fallback for browsers without requestIdleCallback
  const timeout = options?.timeout || 0
  return (window as unknown as Window).setTimeout(callback, timeout) as unknown as number
}

/**
 * Cancel idle callback
 * @param id - Idle callback ID
 */
export function cancelIdleCallback(id: number): void {
  if (!isClient()) {
    return
  }

  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}

