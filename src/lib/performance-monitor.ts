/**
 * Performance monitoring utilities for Web Vitals and metrics
 */

export interface WebVitals {
  name: string
  value: number
  id: string
  delta: number
  rating: 'good' | 'needs-improvement' | 'poor'
  navigationType: string
}

export interface PerformanceMetrics {
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte
  fcpRating?: 'good' | 'needs-improvement' | 'poor'
  lcpRating?: 'good' | 'needs-improvement' | 'poor'
  fidRating?: 'good' | 'needs-improvement' | 'poor'
  clsRating?: 'good' | 'needs-improvement' | 'poor'
  ttfbRating?: 'good' | 'needs-improvement' | 'poor'
}

type MetricRating = 'good' | 'needs-improvement' | 'poor'

/**
 * Get rating for FCP (First Contentful Paint)
 */
function getFCPRating(value: number): MetricRating {
  if (value <= 1800) return 'good'
  if (value <= 3000) return 'needs-improvement'
  return 'poor'
}

/**
 * Get rating for LCP (Largest Contentful Paint)
 */
function getLCPRating(value: number): MetricRating {
  if (value <= 2500) return 'good'
  if (value <= 4000) return 'needs-improvement'
  return 'poor'
}

/**
 * Get rating for FID (First Input Delay)
 */
function getFIDRating(value: number): MetricRating {
  if (value <= 100) return 'good'
  if (value <= 300) return 'needs-improvement'
  return 'poor'
}

/**
 * Get rating for CLS (Cumulative Layout Shift)
 */
function getCLSRating(value: number): MetricRating {
  if (value <= 0.1) return 'good'
  if (value <= 0.25) return 'needs-improvement'
  return 'poor'
}

/**
 * Get rating for TTFB (Time to First Byte)
 */
function getTTFBRating(value: number): MetricRating {
  if (value <= 800) return 'good'
  if (value <= 1800) return 'needs-improvement'
  return 'poor'
}

/**
 * Report Web Vitals metric
 * @param metric - Web Vitals metric
 * @param onReport - Callback to handle metric reporting
 */
export function reportWebVital(
  metric: WebVitals,
  onReport?: (metric: WebVitals) => void
): void {
  if (onReport) {
    onReport(metric)
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    })
  }
}

/**
 * Collect performance metrics
 * @returns Performance metrics object
 */
export async function collectPerformanceMetrics(): Promise<PerformanceMetrics> {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return {}
  }

  const metrics: PerformanceMetrics = {}

  // Collect FCP
  try {
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0]
    if (fcpEntry) {
      metrics.fcp = fcpEntry.startTime
      metrics.fcpRating = getFCPRating(metrics.fcp)
    }
  } catch (e) {
    // Ignore errors
  }

  // Collect TTFB
  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigationEntry) {
      metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart
      metrics.ttfbRating = getTTFBRating(metrics.ttfb)
    }
  } catch (e) {
    // Ignore errors
  }

  return metrics
}

/**
 * Measure page load time
 * @returns Page load time in milliseconds
 */
export function getPageLoadTime(): number {
  if (typeof window === 'undefined' || !performance.timing) {
    return 0
  }

  const timing = performance.timing
  return timing.loadEventEnd - timing.navigationStart
}

/**
 * Measure DOM content loaded time
 * @returns DOM content loaded time in milliseconds
 */
export function getDOMContentLoadedTime(): number {
  if (typeof window === 'undefined' || !performance.timing) {
    return 0
  }

  const timing = performance.timing
  return timing.domContentLoadedEventEnd - timing.navigationStart
}

/**
 * Get memory usage (if available)
 * @returns Memory usage information
 */
export function getMemoryUsage(): {
  usedJSHeapSize?: number
  totalJSHeapSize?: number
  jsHeapSizeLimit?: number
} | null {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return null
  }

  // @ts-expect-error - memory is not in standard Performance type
  const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory

  if (!memory) {
    return null
  }

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  }
}

/**
 * Monitor performance and report metrics
 * @param onMetrics - Callback when metrics are collected
 */
export function monitorPerformance(
  onMetrics?: (metrics: PerformanceMetrics) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  // Collect initial metrics after page load
  const collectMetrics = async () => {
    const metrics = await collectPerformanceMetrics()
    if (onMetrics) {
      onMetrics(metrics)
    }
  }

  // Wait for page to be fully loaded
  if (document.readyState === 'complete') {
    setTimeout(collectMetrics, 1000)
  } else {
    window.addEventListener('load', () => {
      setTimeout(collectMetrics, 1000)
    })
  }

  return () => {
    // Cleanup if needed
  }
}

/**
 * Get bundle size from performance entries
 * @returns Bundle size information
 */
export function getBundleSizeFromPerformance(): {
  totalSize: number
  resources: Array<{ name: string; size: number; duration: number }>
} {
  if (typeof window === 'undefined' || !performance.getEntriesByType) {
    return { totalSize: 0, resources: [] }
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  const jsResources = resources.filter((r) => r.name.endsWith('.js'))

  const resourceData = jsResources.map((r) => ({
    name: r.name,
    size: r.transferSize || 0,
    duration: r.duration,
  }))

  const totalSize = resourceData.reduce((sum, r) => sum + r.size, 0)

  return {
    totalSize,
    resources: resourceData,
  }
}

