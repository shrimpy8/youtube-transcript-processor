/**
 * Common utilities for LLM API calls
 * Shared helper functions for handling API requests and responses
 */

import * as fs from 'fs/promises'
import * as path from 'path'

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
    return 'Rate limit reached. Please wait a moment and try again.'
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
 * Extracts all [HH:MM:SS] timestamps from transcript text
 * and returns the first and last ones found.
 *
 * @param transcript - Transcript text with inline timestamps
 * @returns Object with first and last timestamp strings, or null if none found
 */
function extractTimeRange(transcript: string): { first: string; last: string } | null {
  const matches = transcript.match(/\[(\d{2}:\d{2}:\d{2})\]/g)
  if (!matches || matches.length === 0) return null

  const first = matches[0].replace(/[[\]]/g, '')
  const last = matches[matches.length - 1].replace(/[[\]]/g, '')
  return { first, last }
}

/**
 * Builds full prompt from template and transcript
 * Combines the prompt template with the transcript in a standardized format.
 * If timestamps are detected, injects the episode time range so the LLM
 * knows the full duration and can ensure coverage.
 *
 * @param promptTemplate - The base prompt template with instructions
 * @param transcript - The transcript text to analyze
 * @returns Complete prompt string ready for API submission
 */
/**
 * Sections that belong in the system prompt (behavioral constraints).
 * Everything else goes into the user message (task content).
 */
const SYSTEM_PROMPT_SECTIONS = new Set([
  'Role',
  'Critical Rules',
  'Context',
  'Constraints',
  'Quality Checklist',
  'Final Reminder',
])

/**
 * Splits a markdown prompt template into sections based on `## ` headers.
 * Returns an array of { header, content } objects.
 */
function splitPromptSections(promptTemplate: string): Array<{ header: string; content: string }> {
  const sections: Array<{ header: string; content: string }> = []
  // Split on ## headers, capturing the header text
  const parts = promptTemplate.split(/^## /m)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (i === 0) {
      // Content before the first ## header (e.g., HTML comment)
      const trimmed = part.trim()
      if (trimmed) {
        sections.push({ header: '', content: trimmed })
      }
      continue
    }
    const newlineIdx = part.indexOf('\n')
    if (newlineIdx === -1) {
      sections.push({ header: part.trim(), content: '' })
    } else {
      const header = part.substring(0, newlineIdx).trim()
      const content = part.substring(newlineIdx + 1)
      sections.push({ header, content })
    }
  }
  return sections
}

/**
 * Builds separated system prompt and user message for Anthropic's Messages API.
 * Behavioral rules go into the system prompt (higher priority), while
 * task content and transcript go into the user message.
 *
 * @param promptTemplate - The base prompt template with instructions
 * @param transcript - The transcript text to analyze
 * @returns Object with systemPrompt and userMessage strings
 */
export async function buildAnthropicPromptParts(
  promptTemplate: string,
  transcript: string
): Promise<{ systemPrompt: string; userMessage: string }> {
  const sections = splitPromptSections(promptTemplate)
  const timeRange = extractTimeRange(transcript)

  const systemParts: string[] = []
  const userParts: string[] = []

  for (const section of sections) {
    if (!section.header) {
      // Pre-header content (HTML comments) — skip from both
      continue
    }
    const target = SYSTEM_PROMPT_SECTIONS.has(section.header) ? systemParts : userParts
    target.push(`## ${section.header}\n${section.content}`)
  }

  // Add time range and transcript to user message
  if (timeRange) {
    userParts.push(`## Episode Time Range\n\nThis episode runs from **${timeRange.first}** to **${timeRange.last}**. Your output MUST include bullets/content referencing material from the ENTIRE range — early, middle, AND late portions. Do NOT stop coverage before the end of the episode. If the style is bullets, ensure your bullets are in chronological order (ascending timestamps) and the last bullet references content near ${timeRange.last}.`)
  }

  userParts.push(`## Transcript\n\n${transcript}\n\nPlease provide your analysis:`)

  // Load XML-tagged hard exclusion block from file and append to system prompt
  try {
    const exclusionsPath = path.join(process.cwd(), 'prompts', 'anthropic-exclusions.xml')
    const exclusionsContent = await fs.readFile(exclusionsPath, 'utf-8')
    systemParts.push(exclusionsContent.trim())
  } catch {
    // If file can't be loaded, skip exclusions rather than fail the request
  }

  return {
    systemPrompt: systemParts.join('\n\n'),
    userMessage: userParts.join('\n\n'),
  }
}

export function buildFullPrompt(promptTemplate: string, transcript: string): string {
  const timeRange = extractTimeRange(transcript)

  let timeRangeNote = ''
  if (timeRange) {
    timeRangeNote = `\n\n## Episode Time Range\n\nThis episode runs from **${timeRange.first}** to **${timeRange.last}**. Your output MUST include bullets/content referencing material from the ENTIRE range — early, middle, AND late portions. Do NOT stop coverage before the end of the episode. If the style is bullets, ensure your bullets are in chronological order (ascending timestamps) and the last bullet references content near ${timeRange.last}.`
  }

  return `${promptTemplate}${timeRangeNote}\n\n## Transcript\n\n${transcript}\n\nPlease provide your analysis:`
}

