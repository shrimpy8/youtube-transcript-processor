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

/**
 * API response helpers for standardized error and success responses
 */

/**
 * Creates a standardized error response
 * @param error - Error to convert to response
 * @param defaultMessage - Default error message if error doesn't have one
 * @returns NextResponse with error details
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): NextResponse {
  // Handle known error types
  if (error instanceof NoTranscriptError) {
    return NextResponse.json(
      { 
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
        error: error.message,
        type: error.type,
      },
      { status: error.statusCode }
    )
  }
  
  if (error instanceof NetworkError) {
    return NextResponse.json(
      { 
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
 * @returns NextResponse with success data
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    { success: true, ...(typeof data === 'object' && data !== null ? data : { data }) },
    { status }
  )
}

/**
 * Handles API errors with standardized response
 * @param error - Error to handle
 * @param defaultMessage - Default error message
 * @returns NextResponse with error details
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): NextResponse {
  console.error('API error:', error)
  return createErrorResponse(error, defaultMessage)
}

