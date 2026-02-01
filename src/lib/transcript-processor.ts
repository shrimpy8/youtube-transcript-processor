import { TranscriptSegment, ProcessedTranscript, ProcessingOptions } from '@/types'
import { cleanTranscriptText, normalizeTextForComparison } from './utils'
import { HOST_PATTERNS, GUEST_PATTERNS, TEXT_PROCESSING, DEFAULT_PROCESSING_OPTIONS } from './constants'
import { formatSrtTime, formatVttTime, formatDuration } from './date-utils'

/**
 * Advanced transcript processing utilities
 * Ported from the Python logic in the original shell script
 */

// Re-export cleanTranscriptText for backward compatibility
export { cleanTranscriptText }

/**
 * Aggressive deduplication algorithm
 * Ported from the Python implementation in the shell script
 * @param segments - Array of transcript segments
 * @returns Deduplicated segments
 */
export function aggressiveDeduplication(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (!segments.length) return []

  // Join all segments into full text
  const fullText = segments.map(s => s.text).join(' ')
  
  // Step 1: Remove repeated arrows and formatting artifacts
  let cleanedText = fullText
    .replace(/(>>\s*)+/g, '>> ')
    .replace(/(\*\*[^*]*\*\*:\s*)+/g, '')
  
  // Step 2: Aggressive phrase deduplication
  // Remove sequences of 2+ repeated words
  for (let i = TEXT_PROCESSING.MAX_PHRASE_DEDUPLICATION_LENGTH; i >= TEXT_PROCESSING.MIN_PHRASE_DEDUPLICATION_LENGTH; i--) {
    const pattern = new RegExp(`\\b((?:\\w+\\s+){${i-1}}\\w+)(?:\\s+\\1)+\\b`, 'gi')
    cleanedText = cleanedText.replace(pattern, '$1')
  }
  
  // Step 3: Remove immediate word repetitions
  cleanedText = cleanedText.replace(/\b(\w+)\s+\1\b/gi, '$1')
  
  // Step 4: Clean up multiple spaces
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim()
  
  // Step 5: Split into sentences and remove duplicates
  const sentences = cleanedText.split(/[.!?]+/)
  const uniqueSentences: string[] = []
  const seenNormalized = new Set<string>()
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (trimmed.length < TEXT_PROCESSING.MIN_SENTENCE_LENGTH) continue // Skip very short fragments
    
    // Normalize for comparison using centralized utility
    const normalized = normalizeTextForComparison(trimmed)
    
    if (normalized && normalized.length > TEXT_PROCESSING.MIN_NORMALIZED_LENGTH && !seenNormalized.has(normalized)) {
      uniqueSentences.push(trimmed)
      seenNormalized.add(normalized)
    }
  }
  
  // Reconstruct segments with deduplicated content
  return reconstructSegments(uniqueSentences, segments)
}

/**
 * Reconstructs segments from deduplicated sentences
 * @param sentences - Deduplicated sentences
 * @param originalSegments - Original segments for timing reference
 * @returns Reconstructed segments
 */
function reconstructSegments(sentences: string[], originalSegments: TranscriptSegment[]): TranscriptSegment[] {
  const result: TranscriptSegment[] = []
  let currentIndex = 0
  
  for (const sentence of sentences) {
    if (currentIndex < originalSegments.length) {
      result.push({
        ...originalSegments[currentIndex],
        text: sentence
      })
      currentIndex++
    }
  }
  
  return result
}

/**
 * Detects speaker based on content patterns with improved logic
 * @param text - Text to analyze
 * @returns Detected speaker or null
 */
export function detectSpeaker(text: string): string | null {
  const lowerText = text.toLowerCase()
  const trimmedText = text.trim()
  
  // Check for host patterns (including regex patterns)
  for (const pattern of HOST_PATTERNS) {
    if (typeof pattern === 'string') {
      if (lowerText.includes(pattern)) {
        return 'Host'
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(trimmedText)) {
        return 'Host'
      }
    }
  }
  
  // Check for guest patterns
  for (const pattern of GUEST_PATTERNS) {
    if (lowerText.includes(pattern)) {
      return 'Guest'
    }
  }
  
  // Additional heuristics for host detection
  // Hosts often introduce the show/podcast name early
  if (/welcome to\s+[^,\.]+(?:podcast|show|episode)/i.test(trimmedText)) {
    return 'Host'
  }
  
  // Hosts often mention "today" when introducing guests
  if (/today (?:i|we) have/i.test(trimmedText)) {
    return 'Host'
  }
  
  // Hosts often use phrases like "let's dive in" or "let's get started"
  if (/let\'s (?:dive|get|start)/i.test(trimmedText)) {
    return 'Host'
  }
  
  return null
}

/**
 * Joins text segments with proper sentence spacing.
 * Adds space between segments, handles sentence breaks and concatenated words.
 */
function joinSegmentsWithSpacing(segments: string[]): string {
  if (segments.length === 0) return ''
  if (segments.length === 1) return segments[0].trim()

  let result = segments[0].trim()

  for (let i = 1; i < segments.length; i++) {
    const currentSegment = segments[i].trim()
    if (!currentSegment) continue

    result = result.trim()

    const resultEndsWithLetter = /[a-zA-Z]$/.test(result)
    const currentStartsWithCapital = /^[A-Z]/.test(currentSegment)

    // Fix concatenated words like "increaseSo" -> "increase So"
    if (resultEndsWithLetter && currentStartsWithCapital && !result.endsWith(' ')) {
      const lastChar = result[result.length - 1]
      if (lastChar === lastChar.toLowerCase()) {
        result += ' ' + currentSegment
        continue
      }
    }

    const endsWithPunctuation = /[.!?]$/.test(result)

    if (endsWithPunctuation) {
      result += '  ' + currentSegment  // Double space after punctuation
    } else {
      result += ' ' + currentSegment
    }
  }

  return result
}

/**
 * Enhanced speaker detection for early segments (first 20).
 * Catches host introductions that the general detectSpeaker misses.
 */
function detectEarlySpeaker(text: string): string | null {
  const lowerText = text.toLowerCase()
  const trimmedText = text.trim()

  if (lowerText.includes('welcome to') ||
      lowerText.includes('hey everyone') ||
      lowerText.includes('hi everyone') ||
      lowerText.includes('hello everyone') ||
      /^i'm\s+\w+/i.test(trimmedText) ||
      /^this is\s+\w+/i.test(trimmedText) ||
      (lowerText.includes('podcast') && (lowerText.includes('on') || lowerText.includes('about') || lowerText.includes('how'))) ||
      (lowerText.includes('today i have') || lowerText.includes('today we have')) ||
      (lowerText.includes('product leader') || lowerText.includes('i\'m claire') || lowerText.includes('mission to help'))) {
    return 'Host'
  }
  return null
}

/**
 * Attributes early undetected segments to Host if they look like a host introduction.
 * Returns formatted text or null if no attribution is appropriate.
 */
function attributeEarlySegments(earlySegments: string[]): string | null {
  if (earlySegments.length === 0) return null
  const earlyText = joinSegmentsWithSpacing(earlySegments)
  if (!earlyText) return null

  const lowerEarlyText = earlyText.toLowerCase()
  if (lowerEarlyText.includes('welcome') ||
      lowerEarlyText.includes('hey everyone') ||
      lowerEarlyText.includes('podcast') ||
      /i'm\s+\w+/i.test(earlyText)) {
    return `\n\n**Host**: ${earlyText}`
  }
  return earlyText
}

/**
 * Joins formatted parts with proper spacing between speaker labels and text blocks.
 */
function joinFormattedParts(parts: string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]

  let result = parts[0]

  for (let i = 1; i < parts.length; i++) {
    const currentPart = parts[i]

    if (currentPart.startsWith('\n\n**')) {
      // Speaker label already has newlines
      result += currentPart
    } else if (result.endsWith('\n') || result.endsWith('\n\n')) {
      result += currentPart
    } else if (/[.!?]$/.test(result.trim())) {
      result += ' ' + currentPart
    } else {
      result += ' ' + currentPart
    }
  }

  return result
}

/**
 * Formats transcript with speaker detection
 * @param segments - Transcript segments
 * @returns Formatted transcript with speaker labels
 */
export function formatWithSpeakers(segments: TranscriptSegment[]): string {
  if (!segments.length) return ''

  const formattedParts: string[] = []
  let currentSpeaker: string | null = null
  const paragraphBuffer: string[] = []
  const earlyUndetectedSegments: string[] = []
  let hasDetectedFirstSpeaker = false

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const text = segment.text.trim()
    if (!text) continue

    // Detect speaker — use enhanced detection for early segments
    let newSpeaker = detectSpeaker(text)
    if (!newSpeaker && i < 20) {
      newSpeaker = detectEarlySpeaker(text)
    }

    // Collect early segments until first speaker is detected
    if (!hasDetectedFirstSpeaker) {
      if (newSpeaker) {
        hasDetectedFirstSpeaker = true
        if (newSpeaker === 'Host' && earlyUndetectedSegments.length > 0) {
          const earlyText = joinSegmentsWithSpacing(earlyUndetectedSegments)
          if (earlyText) {
            formattedParts.push(`\n\n**Host**: ${earlyText}`)
          }
          earlyUndetectedSegments.length = 0
        }
      } else {
        earlyUndetectedSegments.push(text)
        continue
      }
    }

    // Handle speaker changes
    if (newSpeaker !== currentSpeaker) {
      if (paragraphBuffer.length) {
        const joinedText = joinSegmentsWithSpacing(paragraphBuffer)
        if (joinedText) {
          formattedParts.push(joinedText)
        }
        paragraphBuffer.length = 0
      }

      if (newSpeaker) {
        formattedParts.push(`\n\n**${newSpeaker}**: ${text}`)
        currentSpeaker = newSpeaker
      } else {
        paragraphBuffer.push(text)
      }
    } else {
      paragraphBuffer.push(text)
    }
  }

  // Attribute early segments if no speaker was ever detected
  if (!hasDetectedFirstSpeaker) {
    const attributed = attributeEarlySegments(earlyUndetectedSegments)
    if (attributed) {
      formattedParts.push(attributed)
    }
  }

  // Flush remaining buffer
  if (paragraphBuffer.length) {
    const joinedText = joinSegmentsWithSpacing(paragraphBuffer)
    if (joinedText) {
      formattedParts.push(joinedText)
    }
  }

  return joinFormattedParts(formattedParts)
}

/**
 * Main transcript processing function
 * @param segments - Raw transcript segments
 * @param options - Processing options
 * @returns Processed transcript
 */
export function processTranscript(
  segments: TranscriptSegment[],
  options: ProcessingOptions = DEFAULT_PROCESSING_OPTIONS
): ProcessedTranscript {
  let processedSegments = [...segments]
  
  // Clean and normalize text
  if (options.normalizeText) {
    processedSegments = processedSegments.map(segment => ({
      ...segment,
      text: cleanTranscriptText(segment.text)
    }))
  }
  
  // Apply deduplication
  if (options.deduplication) {
    processedSegments = aggressiveDeduplication(processedSegments)
  }
  
  // Detect speakers
  if (options.speakerDetection) {
    processedSegments = processedSegments.map(segment => ({
      ...segment,
      speaker: detectSpeaker(segment.text) || segment.speaker
    }))
  }
  
  // Calculate statistics
  const totalDuration = processedSegments.reduce((sum, segment) => sum + segment.duration, 0)
  const wordCount = processedSegments.reduce((sum, segment) => 
    sum + segment.text.split(/\s+/).length, 0
  )
  const speakers = Array.from(new Set(
    processedSegments
      .map(s => s.speaker)
      .filter(Boolean)
  )) as string[]
  
  return {
    segments: processedSegments,
    speakers,
    totalDuration,
    wordCount
  }
}

/**
 * Exports transcript in various formats
 * @param transcript - Processed transcript
 * @param format - Export format
 * @param includeMetadata - Whether to include metadata
 * @returns Formatted transcript string
 */
export function exportTranscript(
  transcript: ProcessedTranscript,
  format: 'txt' | 'json' | 'srt' | 'vtt',
  includeMetadata: boolean = true
): string {
  switch (format) {
    case 'txt':
      return exportAsText(transcript, includeMetadata)
    case 'json':
      return exportAsJson(transcript, includeMetadata)
    case 'srt':
      return exportAsSrt(transcript)
    case 'vtt':
      return exportAsVtt(transcript)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * Export as plain text
 */
function exportAsText(transcript: ProcessedTranscript, includeMetadata: boolean): string {
  let result = ''
  
  if (includeMetadata) {
    result += `# Transcript\n`
    result += `Total Duration: ${formatDuration(transcript.totalDuration)}\n`
    result += `Word Count: ${transcript.wordCount}\n`
    result += `Speakers: ${transcript.speakers.join(', ')}\n\n`
  }
  
  result += formatWithSpeakers(transcript.segments)
  result += '\n\n---\n'
  result += '*Note: Speaker identification is automated and may not be 100% accurate.*\n'
  
  return result
}

/**
 * Export as JSON
 */
function exportAsJson(transcript: ProcessedTranscript, includeMetadata: boolean): string {
  const exportData = {
    ...(includeMetadata && {
      metadata: {
        totalDuration: transcript.totalDuration,
        wordCount: transcript.wordCount,
        speakers: transcript.speakers,
        segmentCount: transcript.segments.length
      }
    }),
    segments: transcript.segments
  }
  
  return JSON.stringify(exportData, null, 2)
}

/**
 * Export as SRT format
 */
function exportAsSrt(transcript: ProcessedTranscript): string {
  return transcript.segments
    .map((segment, index) => {
      const start = formatSrtTime(segment.start)
      const end = formatSrtTime(segment.start + segment.duration)
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`
    })
    .join('\n')
}

/**
 * Export as VTT format
 */
function exportAsVtt(transcript: ProcessedTranscript): string {
  let result = 'WEBVTT\n\n'
  
  result += transcript.segments
    .map(segment => {
      const start = formatVttTime(segment.start)
      const end = formatVttTime(segment.start + segment.duration)
      return `${start} --> ${end}\n${segment.text}\n`
    })
    .join('\n')
  
  return result
}
