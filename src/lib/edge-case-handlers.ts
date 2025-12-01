/**
 * Edge case handling utilities
 */

import { TranscriptSegment, ProcessedTranscript } from '@/types'

/**
 * Validates and handles empty transcript
 */
export function handleEmptyTranscript(segments: TranscriptSegment[] | null | undefined): {
  isEmpty: boolean
  message?: string
} {
  if (!segments || segments.length === 0) {
    return {
      isEmpty: true,
      message: 'This video does not have captions available. Please try a video with captions enabled.',
    }
  }
  return { isEmpty: false }
}

/**
 * Validates transcript length and handles very long transcripts
 */
export function handleLongTranscript(
  segments: TranscriptSegment[],
  maxWords: number = 50000
): {
  isTooLong: boolean
  wordCount: number
  warning?: string
} {
  const wordCount = segments.reduce((count, segment) => {
    return count + (segment.text?.split(/\s+/).length || 0)
  }, 0)

  if (wordCount > maxWords) {
    return {
      isTooLong: true,
      wordCount,
      warning: `This transcript is very long (${wordCount.toLocaleString()} words). Processing may take longer than usual.`,
    }
  }

  return {
    isTooLong: false,
    wordCount,
  }
}

/**
 * Validates and sanitizes transcript segments
 */
export function validateTranscriptSegments(
  segments: unknown
): TranscriptSegment[] | null {
  if (!segments) {
    return null
  }

  if (!Array.isArray(segments)) {
    return null
  }

  // Filter out invalid segments
  const validSegments = segments.filter((segment): segment is TranscriptSegment => {
    return (
      typeof segment === 'object' &&
      segment !== null &&
      'text' in segment &&
      typeof segment.text === 'string' &&
      'start' in segment &&
      typeof segment.start === 'number' &&
      'duration' in segment &&
      typeof segment.duration === 'number'
    )
  })

  return validSegments.length > 0 ? validSegments : null
}

/**
 * Handles malformed API responses
 */
export function handleMalformedResponse(response: unknown): {
  isValid: boolean
  error?: string
  data?: unknown
} {
  if (!response || typeof response !== 'object') {
    return {
      isValid: false,
      error: 'Invalid response format received from server',
    }
  }

  // Check for common response structures
  if ('success' in response && 'data' in response) {
    return {
      isValid: true,
      data: response,
    }
  }

  if ('error' in response) {
    return {
      isValid: false,
      error: typeof response.error === 'string' ? response.error : 'An error occurred',
      data: response,
    }
  }

  // If it has segments, assume it's a valid transcript response
  if ('segments' in response && Array.isArray(response.segments)) {
    return {
      isValid: true,
      data: response,
    }
  }

  return {
    isValid: false,
    error: 'Unexpected response format',
    data: response,
  }
}

/**
 * Handles network failures and timeouts
 */
export function handleNetworkError(error: unknown): {
  isNetworkError: boolean
  isTimeout: boolean
  message: string
} {
  if (error instanceof Error) {
    // Check for timeout
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        isNetworkError: true,
        isTimeout: true,
        message: 'Request timed out. Please check your internet connection and try again.',
      }
    }

    // Check for network errors
    if (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch')
    ) {
      return {
        isNetworkError: true,
        isTimeout: false,
        message: 'Network error. Please check your internet connection and try again.',
      }
    }
  }

  return {
    isNetworkError: false,
    isTimeout: false,
    message: 'An unexpected error occurred',
  }
}

/**
 * Validates processed transcript data
 */
export function validateProcessedTranscript(
  transcript: unknown
): transcript is ProcessedTranscript {
  if (!transcript || typeof transcript !== 'object') {
    return false
  }

  const t = transcript as Record<string, unknown>

  return (
    Array.isArray(t.segments) &&
    Array.isArray(t.speakers) &&
    typeof t.totalDuration === 'number' &&
    typeof t.wordCount === 'number'
  )
}

/**
 * Handles browser compatibility issues
 */
export function checkBrowserCompatibility(): {
  isCompatible: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for required APIs
  if (typeof window === 'undefined') {
    return { isCompatible: true, issues: [] } // Server-side rendering
  }

  if (!navigator.clipboard && !document.execCommand) {
    issues.push('Clipboard API not available. Copy functionality may not work.')
  }

  if (!window.fetch) {
    issues.push('Fetch API not available. Network requests may fail.')
  }

  if (!Array.isArray) {
    issues.push('Array methods not available. Some features may not work.')
  }

  return {
    isCompatible: issues.length === 0,
    issues,
  }
}

