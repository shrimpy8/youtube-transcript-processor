import { 
  AppError, 
  ErrorType, 
  NoTranscriptError, 
  VideoNotFoundError, 
  NetworkError, 
  RateLimitError 
} from './errors'
import { extractErrorMessage } from './utils'

/**
 * Error mapping utilities for yt-dlp and API errors
 */

/**
 * Checks if error indicates video unavailable
 * @param error - Error to check
 * @returns True if error indicates video unavailable
 */
export function isVideoUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const errorMessage = error.message.toLowerCase()
  return (
    errorMessage.includes('video unavailable') ||
    errorMessage.includes('video not found') ||
    errorMessage.includes('private video') ||
    errorMessage.includes('video is unavailable') ||
    errorMessage.includes('this video is not available')
  )
}

/**
 * Checks if error indicates rate limit
 * @param error - Error to check
 * @returns True if error indicates rate limit
 */
export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const errorMessage = error.message.toLowerCase()
  return (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('429') ||
    errorMessage.includes('rate limit exceeded') ||
    errorMessage.includes('too many requests')
  )
}

/**
 * Checks if error indicates network issue
 * @param error - Error to check
 * @returns True if error indicates network issue
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const errorMessage = error.message.toLowerCase()
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound')
  )
}

/**
 * Checks if error indicates not found (404)
 * @param error - Error to check
 * @returns True if error indicates not found
 */
export function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const errorMessage = error.message.toLowerCase()
  return (
    errorMessage.includes('not found') ||
    errorMessage.includes('404') ||
    errorMessage.includes('does not exist')
  )
}

/**
 * Checks if error indicates transcript not available
 * @param error - Error to check
 * @returns True if error indicates transcript not available
 */
export function isTranscriptUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const errorMessage = error.message.toLowerCase()
  return (
    errorMessage.includes('subtitles') && errorMessage.includes('not available') ||
    errorMessage.includes('no subtitle file found') ||
    errorMessage.includes('no transcript') ||
    errorMessage.includes('captions not available') ||
    errorMessage.includes('subtitle not found')
  )
}

/**
 * Maps yt-dlp errors to application errors
 * @param error - Error to map
 * @param context - Optional context (e.g., videoId)
 * @returns Mapped application error
 */
export function mapYtDlpError(error: unknown, context?: { videoId?: string }): Error {
  const videoId = context?.videoId || 'unknown'
  
  // If already an AppError, return as-is
  if (error instanceof AppError) {
    return error
  }
  
  // Check for specific error types
  if (isTranscriptUnavailableError(error)) {
    return new NoTranscriptError(videoId)
  }
  
  if (isVideoUnavailableError(error)) {
    return new VideoNotFoundError(videoId)
  }
  
  if (isRateLimitError(error)) {
    return new RateLimitError()
  }
  
  if (isNetworkError(error)) {
    const message = extractErrorMessage(error, 'Network error')
    return new NetworkError(message)
  }
  
  if (isNotFoundError(error)) {
    return new VideoNotFoundError(videoId)
  }
  
  // Generic error
  const message = extractErrorMessage(error, 'An unexpected error occurred')
  return new AppError(ErrorType.UNKNOWN, message)
}

