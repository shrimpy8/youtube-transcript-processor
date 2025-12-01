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
 * Formats transcript with speaker detection
 * @param segments - Transcript segments
 * @returns Formatted transcript with speaker labels
 */
export function formatWithSpeakers(segments: TranscriptSegment[]): string {
  if (!segments.length) return ''
  
  const formattedParts: string[] = []
  let currentSpeaker: string | null = null
  const paragraphBuffer: string[] = []
  
  /**
   * Joins text segments with proper sentence spacing
   * Adds space between segments, but ensures proper sentence breaks
   */
  function joinSegmentsWithSpacing(segments: string[]): string {
    if (segments.length === 0) return ''
    if (segments.length === 1) return segments[0].trim()
    
    let result = segments[0].trim()
    
    for (let i = 1; i < segments.length; i++) {
      let currentSegment = segments[i].trim()
      
      if (!currentSegment) continue
      
      // Ensure result doesn't end with a space (normalize)
      result = result.trim()
      
      // Check if result ends without a space and currentSegment starts with a capital letter
      // This handles cases where segments might be concatenated (e.g., "wordWord" -> "word Word")
      const resultEndsWithLetter = /[a-zA-Z]$/.test(result)
      const currentStartsWithCapital = /^[A-Z]/.test(currentSegment)
      
      // If previous ends with letter and current starts with capital, ensure space
      // This fixes concatenated words like "increaseSo" -> "increase So"
      if (resultEndsWithLetter && currentStartsWithCapital && !result.endsWith(' ')) {
        // Check if it looks like concatenated words (lowercase followed by uppercase)
        const lastChar = result[result.length - 1]
        if (lastChar === lastChar.toLowerCase()) {
          result += ' ' + currentSegment
          continue
        }
      }
      
      // Check if previous segment ends with sentence-ending punctuation
      const endsWithPunctuation = /[.!?]$/.test(result)
      
      // Check if current segment starts with common sentence starters
      const startsWithSentenceStarter = /^(And|But|So|Then|Now|Well|Um|Uh|I|This|That|The|It|We|You|They|He|She|It's|That's|This's|There's|Here's)/i.test(currentSegment)
      
      // Always add a space between segments
      // Use double space after punctuation for clearer sentence breaks
      if (endsWithPunctuation) {
        result += '  ' + currentSegment  // Double space after punctuation
      } else if (currentStartsWithCapital || startsWithSentenceStarter) {
        // Single space before capital letter or sentence starter
        result += ' ' + currentSegment
      } else {
        // Regular word continuation - single space
        result += ' ' + currentSegment
      }
    }
    
    return result
  }
  
  // Track early undetected segments before first speaker is detected
  const earlyUndetectedSegments: string[] = []
  let hasDetectedFirstSpeaker = false
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const text = segment.text.trim()
    if (!text) continue
    
    // Detect speaker based on content
    let newSpeaker = detectSpeaker(text)
    
    // Enhanced detection for early segments (first 20 segments)
    // These often contain host introductions that need better pattern matching
    if (!newSpeaker && i < 20) {
      const lowerText = text.toLowerCase()
      const trimmedText = text.trim()
      
      // More comprehensive intro pattern detection
      if (lowerText.includes('welcome to') || 
          lowerText.includes('hey everyone') ||
          lowerText.includes('hi everyone') ||
          lowerText.includes('hello everyone') ||
          /^i\'m\s+\w+/i.test(trimmedText) ||
          /^this is\s+\w+/i.test(trimmedText) ||
          (lowerText.includes('podcast') && (lowerText.includes('on') || lowerText.includes('about') || lowerText.includes('how'))) ||
          (lowerText.includes('today i have') || lowerText.includes('today we have')) ||
          (lowerText.includes('product leader') || lowerText.includes('i\'m claire') || lowerText.includes('mission to help'))) {
        newSpeaker = 'Host'
      }
    }
    
    // If we haven't detected a speaker yet, collect early segments
    if (!hasDetectedFirstSpeaker) {
      if (newSpeaker) {
        // First speaker detected - attribute any early segments to Host if this is Host
        hasDetectedFirstSpeaker = true
        if (newSpeaker === 'Host' && earlyUndetectedSegments.length > 0) {
          // Prepend early segments as host introduction
          const earlyText = joinSegmentsWithSpacing(earlyUndetectedSegments)
          if (earlyText) {
            formattedParts.push(`\n\n**Host**: ${earlyText}`)
          }
          earlyUndetectedSegments.length = 0
        }
      } else {
        // No speaker detected yet - store for potential attribution
        earlyUndetectedSegments.push(text)
        continue // Skip normal processing, we'll handle when speaker is detected
      }
    }
    
    // Add speaker label if changed or starting
    if (newSpeaker !== currentSpeaker) {
      // Flush previous paragraph
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
  
  // If we never detected a speaker but have early segments that look like host intro, attribute to Host
  if (!hasDetectedFirstSpeaker && earlyUndetectedSegments.length > 0) {
    const earlyText = joinSegmentsWithSpacing(earlyUndetectedSegments)
    if (earlyText) {
      // Check if early text looks like host introduction
      const lowerEarlyText = earlyText.toLowerCase()
      if (lowerEarlyText.includes('welcome') || 
          lowerEarlyText.includes('hey everyone') ||
          lowerEarlyText.includes('podcast') ||
          /i\'m\s+\w+/i.test(earlyText)) {
        formattedParts.push(`\n\n**Host**: ${earlyText}`)
      } else {
        formattedParts.push(earlyText)
      }
    }
  }
  
  // Flush remaining buffer
  if (paragraphBuffer.length) {
    const joinedText = joinSegmentsWithSpacing(paragraphBuffer)
    if (joinedText) {
      formattedParts.push(joinedText)
    }
  }
  
  // Join all parts with proper spacing
  // Ensure there's always proper spacing between parts
  if (formattedParts.length === 0) return ''
  if (formattedParts.length === 1) return formattedParts[0]
  
  let finalResult = formattedParts[0]
  
  for (let i = 1; i < formattedParts.length; i++) {
    const currentPart = formattedParts[i]
    const prevPartTrimmed = finalResult.trim()
    
    // Check if previous part ends with punctuation or newline
    const prevEndsWithPunctuation = /[.!?]$/.test(prevPartTrimmed)
    const prevEndsWithNewline = finalResult.endsWith('\n') || finalResult.endsWith('\n\n')
    
    // Check if current part starts with speaker label (starts with **)
    const startsWithSpeakerLabel = currentPart.startsWith('\n\n**')
    
    // If current part starts with speaker label, it already has newlines, so just append
    if (startsWithSpeakerLabel) {
      finalResult += currentPart
    } 
    // If previous part ends with newline, just append (speaker labels handle their own spacing)
    else if (prevEndsWithNewline) {
      finalResult += currentPart
    }
    // If previous part ends with punctuation, add space before next part
    else if (prevEndsWithPunctuation) {
      finalResult += ' ' + currentPart
    }
    // Otherwise, check if we need spacing
    else {
      const currentTrimmed = currentPart.trim()
      // If current part starts with capital letter, it's likely a new sentence - add space
      if (/^[A-Z]/.test(currentTrimmed)) {
        finalResult += ' ' + currentPart
      } else {
        // Regular continuation - ensure space
        finalResult += ' ' + currentPart
      }
    }
  }
  
  return finalResult
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
