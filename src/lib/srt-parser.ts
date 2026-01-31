import { TranscriptSegment } from '@/types'

/**
 * SRT subtitle parser utilities
 * Ported from Python logic in the shell script
 */

/**
 * Parses SRT timestamp string to seconds
 * Format: HH:MM:SS,mmm or HH:MM:SS.mmm
 * @param timeString - SRT timestamp string
 * @returns Time in seconds
 */
export function parseSrtTime(timeString: string): number {
  // Handle both comma and dot separators
  const normalized = timeString.replace(',', '.')
  
  // Match HH:MM:SS.mmm format
  const match = normalized.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/)
  if (!match) {
    // Try without milliseconds
    const matchNoMs = normalized.match(/^(\d{2}):(\d{2}):(\d{2})$/)
    if (matchNoMs) {
      const [, hours, minutes, seconds] = matchNoMs.map(Number)
      return hours * 3600 + minutes * 60 + seconds
    }
    return 0
  }
  
  const [, hours, minutes, seconds, milliseconds] = match.map(Number)
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

/**
 * Cleans SRT text by removing HTML tags and artifacts
 * @param text - Raw text from SRT
 * @returns Cleaned text
 */
export function cleanSrtText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/\[.*?\]/g, '') // Remove brackets content
    .replace(/\(.*?\)/g, '') // Remove parentheses content
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Parses SRT file content and extracts transcript segments
 * @param content - SRT file content as string
 * @returns Array of transcript segments with timing
 */
export function parseSrtFile(content: string): TranscriptSegment[] {
  if (!content || !content.trim()) {
    return []
  }

  // Content is always a string at this point (Buffer handling is in parseSrtContent)
  const srtContent = content

  // Split into subtitle blocks (separated by blank lines)
  const blocks = srtContent.trim().split(/\n\s*\n/)

  const segments: TranscriptSegment[] = []

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    
    // Skip blocks without enough content (need at least sequence number, timestamp, and text)
    if (lines.length < 3) {
      continue
    }

    // First line is sequence number, second line is timestamp
    // Remaining lines are text
    const timestampLine = lines[1]?.trim()
    const textLines = lines.slice(2)

    if (!timestampLine || textLines.length === 0) {
      continue
    }

    // Parse timestamp (format: HH:MM:SS,mmm --> HH:MM:SS,mmm)
    const timestampMatch = timestampLine.match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})$/)
    if (!timestampMatch) {
      continue
    }

    const startTime = parseSrtTime(timestampMatch[1])
    const endTime = parseSrtTime(timestampMatch[2])
    const duration = endTime - startTime

    // Extract and clean text
    const rawText = textLines
      .map(line => line.trim())
      .filter(line => {
        // Skip lines that look like sequence numbers or timestamps
        return line && 
          !/^\d+$/.test(line) && 
          !/^\d{2}:\d{2}:\d{2}/.test(line) &&
          !/^\d+:\d{2}:\d{2}/.test(line)
      })
      .join(' ')

    if (!rawText || rawText.trim().length < 5) {
      continue
    }

    // Clean the text
    const cleanedText = cleanSrtText(rawText)

    if (cleanedText) {
      segments.push({
        text: cleanedText,
        start: startTime,
        duration: Math.max(0, duration),
      })
    }
  }

  return segments
}

/**
 * Parses SRT file from buffer or string with encoding detection
 * @param input - SRT content as string or Buffer
 * @returns Array of transcript segments
 */
export function parseSrtContent(input: string | Buffer): TranscriptSegment[] {
  let content: string

  if (Buffer.isBuffer(input)) {
    // Try UTF-8 first
    try {
      content = input.toString('utf-8')
    } catch {
      // Fallback to Latin-1
      content = input.toString('latin1')
    }
  } else {
    content = input
  }

  return parseSrtFile(content)
}

