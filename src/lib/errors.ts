/**
 * Custom error classes for the application
 */

export enum ErrorType {
  INVALID_URL = 'INVALID_URL',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  NO_TRANSCRIPT = 'NO_TRANSCRIPT',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class with type information
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * No transcript available error
 */
export class NoTranscriptError extends AppError {
  constructor(videoId: string) {
    super(
      ErrorType.NO_TRANSCRIPT,
      `Transcript not available for video: ${videoId}`,
      404
    )
  }
}

/**
 * Video not found error
 */
export class VideoNotFoundError extends AppError {
  constructor(videoId: string) {
    super(
      ErrorType.VIDEO_NOT_FOUND,
      `Video not found: ${videoId}`,
      404
    )
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed') {
    super(
      ErrorType.NETWORK_ERROR,
      message,
      503
    )
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(
      ErrorType.RATE_LIMIT,
      message,
      429
    )
  }
}





