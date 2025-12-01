/**
 * Common utilities for LLM API calls
 * Shared helper functions for handling API requests and responses
 */

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error?: {
    message?: string
  }
}

/**
 * Parses error response from API based on HTTP status code
 * Provides user-friendly error messages for common error scenarios
 * 
 * @param response - The failed HTTP response
 * @param defaultMessage - Default error message if specific parsing fails
 * @returns Formatted error message string
 */
export function parseApiError(
  response: Response,
  defaultMessage: string
): string {
  if (response.status === 429) {
    return `Rate limit exceeded: ${defaultMessage}`
  }
  if (response.status === 401 || response.status === 403) {
    return `Invalid API key: ${defaultMessage}`
  }
  return defaultMessage
}

/**
 * Handles API response errors by parsing the error response and throwing a formatted error
 * 
 * @param response - The failed HTTP response
 * @param providerName - Name of the LLM provider (for error context)
 * @throws Error with formatted error message
 * @remarks Always throws - never returns normally
 */
export async function handleApiResponseError(
  response: Response,
  providerName: string
): Promise<never> {
  let errorData: ApiErrorResponse = {}
  
  try {
    errorData = await response.json()
  } catch (parseError) {
    // If JSON parsing fails, use empty object and fall back to default message
  }
  
  const errorMessage = errorData.error?.message || `${providerName} API error: ${response.status}`
  const parsedError = parseApiError(response, errorMessage)
  
  throw new Error(parsedError)
}

/**
 * Builds full prompt from template and transcript
 * Combines the prompt template with the transcript in a standardized format
 * 
 * @param promptTemplate - The base prompt template with instructions
 * @param transcript - The transcript text to analyze
 * @returns Complete prompt string ready for API submission
 */
export function buildFullPrompt(promptTemplate: string, transcript: string): string {
  return `${promptTemplate}\n\n## Transcript\n\n${transcript}\n\nPlease provide your analysis:`
}

