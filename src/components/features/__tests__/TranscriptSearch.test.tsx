import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TranscriptSearch } from '../TranscriptSearch'
import { useTranscriptSearch } from '@/hooks/useTranscriptSearch'
import { TranscriptSegment } from '@/types'

// Mock the hook
vi.mock('@/hooks/useTranscriptSearch')

const mockSegments: TranscriptSegment[] = [
  { text: 'Hello world', start: 0, duration: 2 },
]

describe('TranscriptSearch', () => {
  const mockSearch = {
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
  }

  beforeEach(() => {
    vi.mocked(useTranscriptSearch).mockReturnValue(mockSearch as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render search input', () => {
    render(<TranscriptSearch search={mockSearch} />)

    const input = screen.getByPlaceholderText('Search transcript...')
    expect(input).toBeInTheDocument()
  })

  it('should update query on input change', () => {
    render(<TranscriptSearch search={mockSearch} />)

    const input = screen.getByPlaceholderText('Search transcript...')
    fireEvent.change(input, { target: { value: 'test' } })

    expect(mockSearch.setQuery).toHaveBeenCalledWith('test')
  })

  it('should show clear button when query exists', () => {
    const searchWithQuery = { ...mockSearch, query: 'test' }
    render(<TranscriptSearch search={searchWithQuery} />)

    const clearButton = screen.getByLabelText('Clear search')
    expect(clearButton).toBeInTheDocument()
  })

  it('should clear search when clear button clicked', () => {
    const searchWithQuery = { ...mockSearch, query: 'test' }
    render(<TranscriptSearch search={searchWithQuery} />)

    const clearButton = screen.getByLabelText('Clear search')
    fireEvent.click(clearButton)

    expect(mockSearch.clearSearch).toHaveBeenCalled()
  })

  it('should show match count when matches exist', () => {
    const searchWithMatches = {
      ...mockSearch,
      query: 'test',
      hasMatches: true,
      matchCount: 5,
      currentMatchIndex: 2,
    }
    render(<TranscriptSearch search={searchWithMatches} />)

    expect(screen.getByText('3 / 5')).toBeInTheDocument()
  })

  it('should show navigation buttons when matches exist', () => {
    const searchWithMatches = {
      ...mockSearch,
      query: 'test',
      hasMatches: true,
      matchCount: 5,
    }
    render(<TranscriptSearch search={searchWithMatches} />)

    expect(screen.getByLabelText('Previous match')).toBeInTheDocument()
    expect(screen.getByLabelText('Next match')).toBeInTheDocument()
  })

  it('should navigate to next match', () => {
    const searchWithMatches = {
      ...mockSearch,
      query: 'test',
      hasMatches: true,
      matchCount: 5,
    }
    render(<TranscriptSearch search={searchWithMatches} />)

    const nextButton = screen.getByLabelText('Next match')
    fireEvent.click(nextButton)

    expect(mockSearch.nextMatch).toHaveBeenCalled()
  })

  it('should navigate to previous match', () => {
    const searchWithMatches = {
      ...mockSearch,
      query: 'test',
      hasMatches: true,
      matchCount: 5,
    }
    render(<TranscriptSearch search={searchWithMatches} />)

    const prevButton = screen.getByLabelText('Previous match')
    fireEvent.click(prevButton)

    expect(mockSearch.previousMatch).toHaveBeenCalled()
  })

  it('should not show match info when no matches', () => {
    render(<TranscriptSearch search={mockSearch} />)

    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Previous match')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Next match')).not.toBeInTheDocument()
  })
})





