import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Debounces a function call
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Text normalization utilities
 */

/**
 * Normalizes text for comparison (removes punctuation, lowercases, normalizes whitespace)
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeTextForComparison(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Removes HTML tags from text
 * @param text - Text to clean
 * @returns Text without HTML tags
 */
export function removeHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, '')
}

/**
 * Removes brackets content from text
 * @param text - Text to clean
 * @returns Text without bracket content
 */
export function removeBrackets(text: string): string {
  return text.replace(/\[.*?\]/g, '')
}

/**
 * Removes parentheses content from text
 * @param text - Text to clean
 * @returns Text without parentheses content
 */
export function removeParentheses(text: string): string {
  return text.replace(/\(.*?\)/g, '')
}

/**
 * Normalizes whitespace (collapses multiple spaces to single space)
 * @param text - Text to normalize
 * @returns Text with normalized whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Cleans and normalizes transcript text
 * Removes HTML tags, brackets, parentheses, and normalizes whitespace
 * @param text - Raw transcript text
 * @returns Cleaned text
 */
export function cleanTranscriptText(text: string): string {
  return normalizeWhitespace(
    removeParentheses(
      removeBrackets(
        removeHtmlTags(text)
      )
    )
  )
}

/**
 * String sanitization utilities
 */

/**
 * Sanitizes a string for use in filenames
 * Replaces non-alphanumeric characters with underscores and limits length
 * @param text - Text to sanitize
 * @param maxLength - Maximum length (default: 50)
 * @returns Sanitized filename-safe string
 */
export function sanitizeFilename(text: string, maxLength: number = 50): string {
  return text
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .substring(0, maxLength)
    .toLowerCase()
}

/**
 * Validates and sanitizes user input
 * @param input - User input to sanitize
 * @returns Sanitized input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

/**
 * Performance timing utility
 */

/**
 * Creates a timer utility for measuring elapsed time
 * @returns Timer object with start, elapsed, and elapsedMs methods
 */
export function createTimer(): {
  start: () => void
  elapsed: () => number
  elapsedMs: () => string
} {
  let startTime: number | null = null
  
  return {
    start: () => {
      startTime = Date.now()
    },
    elapsed: (): number => {
      if (startTime === null) {
        throw new Error('Timer not started. Call start() first.')
      }
      return Date.now() - startTime
    },
    elapsedMs: (): string => {
      if (startTime === null) {
        throw new Error('Timer not started. Call start() first.')
      }
      return `${Date.now() - startTime}ms`
    },
  }
}

/**
 * Formats view count for display
 * @param count - View count number
 * @returns Formatted string (e.g., "1.2M", "500K", "1.5K")
 */
export function formatViewCount(count: number | undefined | null): string {
  if (!count || count === 0) {
    return 'N/A'
  }
  
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`
  }
  
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`
  }
  
  return count.toLocaleString()
}

/**
 * Error handling utilities
 */

/**
 * Extracts error message from unknown error type
 * @param error - Error to extract message from
 * @param defaultMessage - Default message if error is not an Error instance
 * @returns Error message string
 */
export function extractErrorMessage(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): string {
  if (error instanceof Error) {
    return error.message
  }
  return defaultMessage
}
