import { NextResponse } from 'next/server'
import {
  AppError,
  ErrorType,
  NoTranscriptError,
  VideoNotFoundError,
  NetworkError,
  RateLimitError
} from './errors'
import { extractErrorMessage } from './utils'
import { createLogger } from './logger'

const logger = createLogger('api-helpers')

/**
 * API response helpers for standardized error and success responses
 */

/**
 * Generates a unique request ID for correlation across logs and responses
 * Format: req_<timestamp>_<random>
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `req_${timestamp}_${random}`
}

/**
 * Creates a standardized error response
 * @param error - Error to convert to response
 * @param defaultMessage - Default error message if error doesn't have one
 * @param requestId - Optional request correlation ID
 * @returns NextResponse with error details
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred',
  requestId?: string
): NextResponse {
  const rid = requestId ? { requestId } : {}

  // Handle known error types
  if (error instanceof NoTranscriptError) {
    return NextResponse.json(
      {
        ...rid,
        error: error.message,
        type: error.type,
        suggestion: 'This video may not have captions enabled. Try another video.',
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof VideoNotFoundError) {
    return NextResponse.json(
      {
        ...rid,
        error: error.message,
        type: error.type,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof NetworkError) {
    return NextResponse.json(
      {
        ...rid,
        error: error.message,
        type: error.type,
        suggestion: 'Please check your internet connection and try again.',
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        ...rid,
        error: error.message,
        type: error.type,
        suggestion: 'Please wait a moment and try again.',
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        ...rid,
        error: error.message,
        type: error.type,
      },
      { status: error.statusCode || 500 }
    )
  }

  // Unknown error
  const message = extractErrorMessage(error, defaultMessage)
  return NextResponse.json(
    {
      ...rid,
      error: defaultMessage,
      type: ErrorType.UNKNOWN,
      message,
    },
    { status: 500 }
  )
}

/**
 * Creates a standardized success response
 * @param data - Data to include in response
 * @param status - HTTP status code (default: 200)
 * @param requestId - Optional request correlation ID
 * @returns NextResponse with success data
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): NextResponse {
  const rid = requestId ? { requestId } : {}
  return NextResponse.json(
    { success: true, ...rid, ...(typeof data === 'object' && data !== null ? data : { data }) },
    { status }
  )
}

/**
 * Handles API errors with standardized response
 * @param error - Error to handle
 * @param defaultMessage - Default error message
 * @param requestId - Optional request correlation ID
 * @returns NextResponse with error details
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred',
  requestId?: string
): NextResponse {
  logger.error('API error', error, requestId ? { requestId } : undefined)
  return createErrorResponse(error, defaultMessage, requestId)
}

