import { ProcessedTranscript, TranscriptSegment } from '@/types'
import { ALL_PROVIDERS, type LLMProviderKey } from './llm-config'

/**
 * Converts processed transcript to plain text format
 * Combines all segments with speaker labels (if available) into a single text string
 *
 * @param transcript - Processed transcript object with segments array
 * @returns Plain text string with segments separated by double newlines
 * @remarks Speaker labels are included if present in the segment
 */
export function transcriptToText(transcript: ProcessedTranscript): string {
  return transcript.segments
    .map(segment => {
      const speaker = segment.speaker ? `${segment.speaker}: ` : ''
      return `${speaker}${segment.text}`
    })
    .join('\n\n')
}

/**
 * Formats seconds into [HH:MM:SS] timestamp string
 *
 * @param totalSeconds - Time in seconds (e.g., 323)
 * @returns Formatted timestamp string (e.g., "[00:05:23]")
 */
export function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `[${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`
}

/**
 * Converts transcript segments into text with inline [HH:MM:SS] timestamps
 * Used for bullets-style summaries so the LLM can cite real video timestamps
 *
 * @param segments - Array of transcript segments with start times
 * @returns Timestamped text string (e.g., "[00:05:23] segment text")
 */
export function transcriptToTimestampedText(segments: TranscriptSegment[]): string {
  return segments
    .map(segment => {
      const timestamp = formatTimestamp(segment.start)
      const speaker = segment.speaker ? `${segment.speaker}: ` : ''
      return `${timestamp} ${speaker}${segment.text}`
    })
    .join('\n\n')
}

/**
 * Provider display labels for UI
 * Maps provider keys to user-friendly display names shown in the UI
 */
export const PROVIDER_LABELS: Record<LLMProviderKey | 'all', string> = {
  'anthropic': 'Anthropic Sonnet 4.5',
  'google-gemini': 'Google Gemini 2.5 Flash',
  'perplexity': 'Perplexity Sonar Online',
  'all': 'All LLMs',
}

/**
 * Shorter provider labels for space-constrained UI (e.g., tabs)
 */
export const PROVIDER_SHORT_LABELS: Record<LLMProviderKey, string> = {
  'anthropic': 'Anthropic',
  'google-gemini': 'Gemini',
  'perplexity': 'Perplexity',
}

/**
 * Gets all provider keys as a new array
 * Returns a copy of ALL_PROVIDERS to prevent mutation
 * 
 * @returns Array of all provider keys
 */
export function getAllProviders(): LLMProviderKey[] {
  return [...ALL_PROVIDERS]
}

