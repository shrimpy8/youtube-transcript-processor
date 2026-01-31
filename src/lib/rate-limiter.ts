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
 * Creates an in-memory rate limiter per IP.
 * Suitable for single-instance deployments (Vercel serverless functions
 * share module-level state within a warm instance).
 *
 * @param config - Rate limiter configuration
 * @returns Object with `check` function that returns true if under limit
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const map = new Map<string, { count: number; resetAt: number }>()

  return {
    check(ip: string): boolean {
      const now = Date.now()
      const entry = map.get(ip)

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
 * Extracts client IP from a Next.js request
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Returns a 429 JSON response for rate-limited requests
 */
export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please wait about a minute before trying again.',
    },
    { status: 429 }
  )
}
