import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTranscriptSearch } from '../useTranscriptSearch'
import { TranscriptSegment } from '@/types'

const mockSegments: TranscriptSegment[] = [
  { text: 'Hello world', start: 0, duration: 2 },
  { text: 'This is a test', start: 2, duration: 2 },
  { text: 'Hello again', start: 4, duration: 2 },
  { text: 'Another test segment', start: 6, duration: 2 },
]

describe('useTranscriptSearch', () => {
  it('should initialize with empty query', () => {
    const { result } = renderHook(() => useTranscriptSearch(mockSegments))

    expect(result.current.query).toBe('')
    expect(result.current.matches).toEqual([])
    expect(result.current.matchCount).toBe(0)
    expect(result.current.hasMatches).toBe(false)
  })

  it('should find matches when query is set', () => {
    const { result } = renderHook(() => useTranscriptSearch(mockSegments))

    act(() => {
      result.current.setQuery('test')
    })

    expect(result.current.hasMatches).toBe(true)
    expect(result.current.matchCount).toBe(2)
    expect(result.current.matches.length).toBe(2)
  })

  it('should be case-insensitive', () => {
    const { result } = renderHook(() => useTranscriptSearch(mockSegments))

    act(() => {
      result.current.setQuery('TEST')
    })

    expect(result.current.matchCount).toBe(2)
  })

  it('should find multiple matches in same segment', () => {
    const segments: TranscriptSegment[] = [
      { text: 'test test test', start: 0, duration: 2 },
    ]

    const { result } = renderHook(() => useTranscriptSearch(segments))

    act(() => {
      result.current.setQuery('test')
    })

    expect(result.current.matchCount).toBe(3)
  })

  it('should navigate between matches', () => {
    const { result } = renderHook(() => useTranscriptSearch(mockSegments))

    act(() => {
      result.current.setQuery('test')
    })

    expect(result.current.currentMatchIndex).toBe(-1)

    act(() => {
      result.current.nextMatch()
    })

    expect(result.current.currentMatchIndex).toBe(0)

    act(() => {
      result.current.nextMatch()
    })

    expect(result.current.currentMatchIndex).toBe(1)

    act(() => {
      result.current.previousMatch()
    })

    expect(result.current.currentMatchIndex).toBe(0)
  })

  it('should wrap around when navigating', () => {
    const { result } = renderHook(() => useTranscriptSearch(mockSegments))

    act(() => {
      result.current.setQuery('test')
      result.current.setCurrentMatchIndex(1)
    })

    act(() => {
      result.current.nextMatch()
    })

    expect(result.current.currentMatchIndex).toBe(0) // Wrapped around
  })

  it('should clear search', () => {
    const { result } = renderHook(() => useTranscriptSearch(mockSegments))

    act(() => {
      result.current.setQuery('test')
      result.current.setCurrentMatchIndex(1)
    })

    act(() => {
      result.current.clearSearch()
    })

    expect(result.current.query).toBe('')
    expect(result.current.currentMatchIndex).toBe(-1)
  })

  it('should highlight text correctly', () => {
    const { result } = renderHook(() => useTranscriptSearch(mockSegments))

    act(() => {
      result.current.setQuery('test')
    })

    const highlighted = result.current.highlightText('This is a test', 1)
    expect(highlighted).toContain('<mark')
    expect(highlighted).toContain('test')
  })

  it('should return empty matches for empty query', () => {
    const { result } = renderHook(() => useTranscriptSearch(mockSegments))

    act(() => {
      result.current.setQuery('   ')
    })

    expect(result.current.matchCount).toBe(0)
  })
})





