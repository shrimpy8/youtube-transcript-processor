'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronUp, ChevronDown, X, Search } from 'lucide-react'
import { UseTranscriptSearchReturn } from '@/hooks/useTranscriptSearch'

interface TranscriptSearchProps {
  search: UseTranscriptSearchReturn
  className?: string
}

/**
 * Search component for transcript
 */
export function TranscriptSearch({ search, className }: TranscriptSearchProps) {
  const {
    query,
    setQuery,
    matchCount,
    currentMatchIndex,
    hasMatches,
    nextMatch,
    previousMatch,
    clearSearch,
  } = search

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search transcript..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              aria-label="Search transcript"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {hasMatches && (
            <>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>
                  {currentMatchIndex + 1} / {matchCount}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={previousMatch}
                disabled={!hasMatches}
                aria-label="Previous match"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMatch}
                disabled={!hasMatches}
                aria-label="Next match"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}





