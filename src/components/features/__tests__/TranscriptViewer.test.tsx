import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TranscriptViewer } from '../TranscriptViewer'
import { ProcessedTranscript } from '@/types'
import * as clipboardUtils from '@/lib/clipboard-utils'

// Mock the search hook
vi.mock('@/hooks/useTranscriptSearch', () => ({
  useTranscriptSearch: vi.fn(() => ({
    query: '',
    setQuery: vi.fn(),
    matches: [],
    currentMatchIndex: -1,
    setCurrentMatchIndex: vi.fn(),
    hasMatches: false,
    matchCount: 0,
    nextMatch: vi.fn(),
    previousMatch: vi.fn(),
    clearSearch: vi.fn(),
    highlightText: vi.fn((text: string) => text),
  })),
}))

const mockTranscript: ProcessedTranscript = {
  segments: [
    {
      text: 'Hello world',
      start: 0,
      duration: 2,
      speaker: 'Host',
    },
    {
      text: 'This is a test',
      start: 2,
      duration: 3,
      speaker: 'Guest',
    },
  ],
  speakers: ['Host', 'Guest'],
  totalDuration: 5,
  wordCount: 4,
}

describe('TranscriptViewer', () => {
  beforeEach(() => {
    vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue()
  })

  it('should render transcript segments', () => {
    render(<TranscriptViewer transcript={mockTranscript} />)

    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('This is a test')).toBeInTheDocument()
  })

  it('should display speaker labels', () => {
    render(<TranscriptViewer transcript={mockTranscript} />)

    expect(screen.getByText('Host:')).toBeInTheDocument()
    expect(screen.getByText('Guest:')).toBeInTheDocument()
  })

  it('should display video title if provided', () => {
    render(<TranscriptViewer transcript={mockTranscript} videoTitle="Test Video" />)

    expect(screen.getByText('Test Video')).toBeInTheDocument()
  })

  it('should toggle timestamps', () => {
    render(<TranscriptViewer transcript={mockTranscript} />)

    const timestampToggle = screen.getByLabelText('Show Timestamps')
    expect(timestampToggle).not.toBeChecked()

    fireEvent.click(timestampToggle)
    expect(timestampToggle).toBeChecked()
  })

  it('should copy transcript to clipboard', async () => {
    render(<TranscriptViewer transcript={mockTranscript} />)

    const copyButton = screen.getByText('Copy Transcript')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(clipboardUtils.copyToClipboard).toHaveBeenCalled()
    })

    expect(screen.getByText('Copied!')).toBeInTheDocument()
  })

  it('should include timestamps in copied text when enabled', async () => {
    const user = userEvent.setup()
    render(<TranscriptViewer transcript={mockTranscript} />)

    // Get text without timestamps first
    const copyButton = screen.getByText('Copy Transcript')
    await user.click(copyButton)
    
    await waitFor(() => {
      expect(clipboardUtils.copyToClipboard).toHaveBeenCalled()
    })
    
    const textWithoutTimestamps = (clipboardUtils.copyToClipboard as any).mock.calls[0][0]
    vi.clearAllMocks()

    // Enable timestamps
    const timestampToggle = screen.getByLabelText('Show Timestamps')
    await user.click(timestampToggle)
    
    // Wait for toggle to be checked
    await waitFor(() => {
      expect(timestampToggle).toBeChecked()
    })

    // Copy again with timestamps enabled
    await user.click(copyButton)

    await waitFor(() => {
      expect(clipboardUtils.copyToClipboard).toHaveBeenCalled()
      const textWithTimestamps = (clipboardUtils.copyToClipboard as any).mock.calls[0][0]
      // Text with timestamps should be longer and contain timestamp format
      expect(textWithTimestamps.length).toBeGreaterThan(textWithoutTimestamps.length)
      expect(textWithTimestamps).toMatch(/\d+:\d+/)
    })
  })

  it('should apply custom className', () => {
    const { container } = render(
      <TranscriptViewer transcript={mockTranscript} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should render scrollable container', () => {
    render(<TranscriptViewer transcript={mockTranscript} />)

    const container = screen.getByText('Hello world').closest('[class*="overflow-y-auto"]')
    expect(container).toBeInTheDocument()
  })
})

