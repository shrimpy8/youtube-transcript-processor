import { AppError, NoTranscriptError, ErrorType } from './errors'
import { extractErrorMessage } from './utils'

/**
 * Client-side error handling utilities
 * Converts application errors to user-friendly messages for display in UI
 */

/**
 * Formats an error into a user-friendly message for client-side display
 * @param error - Error to format
 * @param defaultMessage - Default message if error cannot be formatted
 * @returns User-friendly error message
 */
export function formatClientErrorMessage(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): string {
  // Handle NoTranscriptError with specific message
  if (error instanceof NoTranscriptError) {
    return 'This video does not have captions available.'
  }

  // Handle AppError instances with user-friendly messages
  if (error instanceof AppError) {
    switch (error.type) {
      case ErrorType.VIDEO_NOT_FOUND:
        return 'Video not found. Please check the URL and try again.'
      case ErrorType.NETWORK_ERROR:
        return 'Network error. Please check your internet connection and try again.'
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.'
      default:
        return error.message || defaultMessage
    }
  }

  // Handle generic Error instances
  return extractErrorMessage(error, defaultMessage)
}

