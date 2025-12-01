import { ProcessedTranscript } from '@/types'
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
 * Gets all provider keys as a new array
 * Returns a copy of ALL_PROVIDERS to prevent mutation
 * 
 * @returns Array of all provider keys
 */
export function getAllProviders(): LLMProviderKey[] {
  return [...ALL_PROVIDERS]
}

