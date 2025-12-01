'use client'

import { useState, useMemo, useCallback } from 'react'
import { TranscriptSegment } from '@/types'

export interface SearchMatch {
  segmentIndex: number
  startIndex: number
  endIndex: number
  text: string
}

export interface UseTranscriptSearchReturn {
  query: string
  setQuery: (query: string) => void
  matches: SearchMatch[]
  currentMatchIndex: number
  setCurrentMatchIndex: (index: number) => void
  hasMatches: boolean
  matchCount: number
  nextMatch: () => void
  previousMatch: () => void
  clearSearch: () => void
  highlightText: (text: string, segmentIndex: number) => string
}

/**
 * Hook for searching and highlighting text in transcript
 */
export function useTranscriptSearch(
  segments: TranscriptSegment[]
): UseTranscriptSearchReturn {
  const [query, setQuery] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)

  // Find all matches
  const matches = useMemo(() => {
    if (!query.trim()) return []

    const searchQuery = query.toLowerCase()
    const foundMatches: SearchMatch[] = []

    segments.forEach((segment, segmentIndex) => {
      const text = segment.text.toLowerCase()
      let startIndex = 0

      while (true) {
        const index = text.indexOf(searchQuery, startIndex)
        if (index === -1) break

        foundMatches.push({
          segmentIndex,
          startIndex: index,
          endIndex: index + searchQuery.length,
          text: segment.text.substring(index, index + searchQuery.length),
        })

        startIndex = index + 1
      }
    })

    return foundMatches
  }, [query, segments])

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length)
  }, [matches.length])

  const previousMatch = useCallback(() => {
    if (matches.length === 0) return
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length)
  }, [matches.length])

  const clearSearch = useCallback(() => {
    setQuery('')
    setCurrentMatchIndex(-1)
  }, [])

  const highlightText = useCallback(
    (text: string, segmentIndex: number): string => {
      if (!query.trim()) return text

      const searchQuery = query
      const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi')
      return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>')
    },
    [query]
  )

  return {
    query,
    setQuery,
    matches,
    currentMatchIndex,
    setCurrentMatchIndex,
    hasMatches: matches.length > 0,
    matchCount: matches.length,
    nextMatch,
    previousMatch,
    clearSearch,
    highlightText,
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}





