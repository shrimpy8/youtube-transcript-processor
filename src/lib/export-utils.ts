import { ProcessedTranscript } from '@/types'
import { exportTranscript } from './transcript-processor'
import { sanitizeFilename } from './utils'

export interface ExportOptions {
  includeMetadata?: boolean
  includeTimestamps?: boolean
}

/**
 * Exports transcript in the specified format
 * @param transcript - Processed transcript
 * @param format - Export format (only 'txt' for now)
 * @param options - Export options
 * @returns Formatted transcript string
 */
export function exportTranscriptToFormat(
  transcript: ProcessedTranscript,
  format: 'txt' = 'txt',
  options: ExportOptions = {}
): string {
  const { includeMetadata = true } = options

  // For now, only support TXT format
  if (format !== 'txt') {
    throw new Error(`Format ${format} is not yet supported. Only TXT is available.`)
  }

  return exportTranscript(transcript, format, includeMetadata)
}

/**
 * Generates a filename for the exported transcript
 * @param videoTitle - Video title (optional)
 * @param format - Export format
 * @returns Sanitized filename
 */
export function generateFilename(videoTitle?: string, format: 'txt' = 'txt'): string {
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  
  let baseName = 'transcript'
  if (videoTitle) {
    // Sanitize video title for filename using centralized utility
    baseName = sanitizeFilename(videoTitle, 50)
  }

  return `${baseName}_${timestamp}.${format}`
}

/**
 * Creates a blob from text content
 * @param content - Text content
 * @param mimeType - MIME type
 * @returns Blob object
 */
export function createDownloadBlob(content: string, mimeType: string = 'text/plain'): Blob {
  return new Blob([content], { type: mimeType })
}

/**
 * Triggers a download of the blob
 * @param blob - Blob to download
 * @param filename - Filename for the download
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports and downloads transcript
 * @param transcript - Processed transcript
 * @param format - Export format
 * @param options - Export options
 * @param videoTitle - Video title for filename
 */
export async function exportAndDownload(
  transcript: ProcessedTranscript,
  format: 'txt' = 'txt',
  options: ExportOptions = {},
  videoTitle?: string
): Promise<void> {
  const content = exportTranscriptToFormat(transcript, format, options)
  const filename = generateFilename(videoTitle, format)
  const mimeType = format === 'txt' ? 'text/plain' : 'application/json'
  const blob = createDownloadBlob(content, mimeType)
  triggerDownload(blob, filename)
}

/**
 * Downloads AI summary as a plain text file
 * @param summary - Summary text content
 * @param provider - LLM provider name (e.g., "Anthropic Sonnet 4.5")
 * @param videoTitle - Optional video title for filename
 * @param summaryStyle - Optional summary style for filename
 */
export function downloadAISummary(
  summary: string,
  provider: string,
  videoTitle?: string,
  summaryStyle?: string
): void {
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const sanitizedProvider = provider.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const styleSuffix = summaryStyle ? `_${summaryStyle}` : ''

  let baseName = 'ai-summary'
  if (videoTitle) {
    baseName = sanitizeFilename(videoTitle, 30)
  }

  const filename = `${baseName}_${sanitizedProvider}${styleSuffix}_${timestamp}.txt`
  const blob = createDownloadBlob(summary, 'text/plain')
  triggerDownload(blob, filename)
}
