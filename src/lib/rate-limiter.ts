import { NextRequest, NextResponse } from 'next/server'

/**
 * Configuration for an in-memory rate limiter
 */
interface RateLimiterConfig {
  /** Maximum requests allowed within the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

/**
 * Standard rate limit presets (requests per minute)
 */
export const RATE_LIMIT_PRESETS = {
  /** Default for most API routes: 10 req/min */
  standard: { maxRequests: 10, windowMs: 60_000 } as RateLimiterConfig,
  /** Higher limit for transcript routes: 20 req/min */
  transcript: { maxRequests: 20, windowMs: 60_000 } as RateLimiterConfig,
} as const

/**
 * Creates an in-memory rate limiter per IP.
 * Suitable for single-instance deployments (Vercel serverless functions
 * share module-level state within a warm instance).
 *
 * @param config - Rate limiter configuration
 * @returns Object with `check` function that returns true if under limit
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const map = new Map<string, { count: number; resetAt: number }>()

  function evictExpired() {
    const now = Date.now()
    for (const [key, entry] of map) {
      if (now > entry.resetAt) map.delete(key)
    }
  }

  return {
    check(ip: string): boolean {
      const now = Date.now()
      const entry = map.get(ip)

      // Lazy eviction: prevent unbounded map growth under sustained traffic
      if (map.size > 1000) evictExpired()

      if (!entry || now > entry.resetAt) {
        map.set(ip, { count: 1, resetAt: now + config.windowMs })
        return true
      }

      if (entry.count >= config.maxRequests) {
        return false
      }

      entry.count++
      return true
    },
  }
}

/**
 * Extracts client IP from a Next.js request.
 *
 * Forwarded headers (x-forwarded-for, x-real-ip) are only trusted when
 * TRUST_PROXY=true, which should only be set when the deployment runs behind
 * a trusted reverse proxy that overwrites these headers. Without a trusted
 * proxy these headers are trivially spoofable by the client.
 *
 * In production without TRUST_PROXY, the rate limiter falls back to 'local'
 * (a single shared bucket) — which is conservative but safe. Set TRUST_PROXY=true
 * once a verified proxy layer is in front of the app.
 */
export function getClientIp(request: NextRequest): string {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
      // Take the rightmost entry added by the trusted proxy, not the leftmost
      // which can be spoofed by the client.
      return forwarded.split(',').pop()?.trim() || 'unknown'
    }
    const realIp = request.headers.get('x-real-ip')
    if (realIp) return realIp.trim()
  }

  if (process.env.NODE_ENV === 'production' && !process.env.TRUST_PROXY) {
    // Warn once per cold start — all requests share the same rate-limit bucket
    // until TRUST_PROXY=true is set and a real proxy provides per-client IPs.
    console.warn(
      '[rate-limiter] TRUST_PROXY is not set. All requests share the same rate-limit bucket. ' +
      'Set TRUST_PROXY=true when running behind a trusted reverse proxy.'
    )
  }

  // Safe fallback: a single shared key. Conservative but not bypassable.
  return 'local'
}

/**
 * Returns a 429 JSON response for rate-limited requests
 */
export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please wait about a minute before trying again.',
      type: 'RATE_LIMIT',
    },
    { status: 429 }
  )
}
