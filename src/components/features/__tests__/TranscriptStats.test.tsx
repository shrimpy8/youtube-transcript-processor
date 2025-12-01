import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TranscriptStats } from '../TranscriptStats'
import { ProcessedTranscript } from '@/types'

const mockTranscript: ProcessedTranscript = {
  segments: [
    { text: 'Hello world', start: 0, duration: 2 },
    { text: 'This is a test', start: 2, duration: 3 },
  ],
  speakers: ['Host', 'Guest'],
  totalDuration: 5,
  wordCount: 6,
}

describe('TranscriptStats', () => {
  it('should render all statistics', () => {
    render(<TranscriptStats transcript={mockTranscript} />)

    expect(screen.getByText('Word Count')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('Speakers')).toBeInTheDocument()
    expect(screen.getByText('Segments')).toBeInTheDocument()
    
    // "2" appears for both speakers and segments, so check both exist
    const twos = screen.getAllByText('2')
    expect(twos.length).toBeGreaterThanOrEqual(2)
  })

  it('should format duration correctly', () => {
    const transcriptWithHours: ProcessedTranscript = {
      ...mockTranscript,
      totalDuration: 3665, // 1 hour, 1 minute, 5 seconds
    }

    render(<TranscriptStats transcript={transcriptWithHours} />)
    
    const durationElement = screen.getByText('1:01:05')
    expect(durationElement).toBeInTheDocument()
  })

  it('should format duration without hours', () => {
    const transcriptMinutes: ProcessedTranscript = {
      ...mockTranscript,
      totalDuration: 125, // 2 minutes, 5 seconds
    }

    render(<TranscriptStats transcript={transcriptMinutes} />)
    
    const durationElement = screen.getByText('2:05')
    expect(durationElement).toBeInTheDocument()
  })

  it('should format large numbers with commas', () => {
    const largeTranscript: ProcessedTranscript = {
      ...mockTranscript,
      wordCount: 12345,
      segments: Array(1234).fill({ text: 'test', start: 0, duration: 1 }),
    }

    render(<TranscriptStats transcript={largeTranscript} />)
    
    expect(screen.getByText('12,345')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <TranscriptStats transcript={mockTranscript} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})

