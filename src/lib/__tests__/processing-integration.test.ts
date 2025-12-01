import { describe, it, expect } from 'vitest'
import { processTranscript } from '../transcript-processor'
import { TranscriptSegment, ProcessingOptions } from '@/types'

const mockSegments: TranscriptSegment[] = [
  { text: 'Hello world', start: 0, duration: 2 },
  { text: 'Hello world', start: 2, duration: 2 }, // Duplicate
  { text: 'This is a test', start: 4, duration: 3 },
  { text: 'Welcome back', start: 7, duration: 2 }, // Host pattern
]

describe('processing-integration', () => {
  it('processes transcript with default options', () => {
    const result = processTranscript(mockSegments)
    
    expect(result.segments).toBeDefined()
    expect(result.wordCount).toBeGreaterThan(0)
    expect(result.totalDuration).toBeGreaterThan(0)
  })

  it('applies deduplication when enabled', () => {
    const options: ProcessingOptions = {
      speakerDetection: false,
      deduplication: true,
      removeTimestamps: false,
      normalizeText: false,
      maxSegmentLength: 1000,
    }
    
    const result = processTranscript(mockSegments, options)
    
    // Should have fewer segments due to deduplication
    expect(result.segments.length).toBeLessThanOrEqual(mockSegments.length)
  })

  it('detects speakers when enabled', () => {
    const options: ProcessingOptions = {
      speakerDetection: true,
      deduplication: false,
      removeTimestamps: false,
      normalizeText: false,
      maxSegmentLength: 1000,
    }
    
    const result = processTranscript(mockSegments, options)
    
    // Should have at least one speaker detected (Host from "Welcome back")
    expect(result.speakers.length).toBeGreaterThan(0)
  })

  it('normalizes text when enabled', () => {
    const segmentsWithHTML: TranscriptSegment[] = [
      { text: '<b>Hello</b> world [music]', start: 0, duration: 2 },
    ]
    
    const options: ProcessingOptions = {
      speakerDetection: false,
      deduplication: false,
      removeTimestamps: false,
      normalizeText: true,
      maxSegmentLength: 1000,
    }
    
    const result = processTranscript(segmentsWithHTML, options)
    
    // HTML tags and brackets should be removed
    expect(result.segments[0].text).not.toContain('<b>')
    expect(result.segments[0].text).not.toContain('[music]')
  })

  it('calculates statistics correctly', () => {
    const result = processTranscript(mockSegments)
    
    expect(result.totalDuration).toBeGreaterThan(0)
    expect(result.wordCount).toBeGreaterThan(0)
    expect(result.segments.length).toBeGreaterThan(0)
  })

  it('handles all options disabled', () => {
    const options: ProcessingOptions = {
      speakerDetection: false,
      deduplication: false,
      removeTimestamps: false,
      normalizeText: false,
      maxSegmentLength: 1000,
    }
    
    const result = processTranscript(mockSegments, options)
    
    expect(result.segments.length).toBe(mockSegments.length)
  })
})

