'use client'

import { useState, useEffect, useRef } from 'react'
import { ProcessedTranscript, TranscriptSegment } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ArrowUp, Copy, Check } from 'lucide-react'
import { copyToClipboard } from '@/lib/clipboard-utils'
import { useTranscriptSearch, UseTranscriptSearchReturn } from '@/hooks/useTranscriptSearch'
import { TranscriptSearch } from './TranscriptSearch'
import { cn } from '@/lib/utils'
import { formatTimestamp as formatTimestampUtil } from '@/lib/date-utils'

interface TranscriptViewerProps {
  transcript: ProcessedTranscript
  videoTitle?: string
  className?: string
  search?: UseTranscriptSearchReturn
}

/**
 * Formats timestamp in seconds to readable format
 * Uses centralized utility
 */
function formatTimestamp(seconds: number): string {
  return formatTimestampUtil(seconds)
}

/**
 * Gets speaker color class
 */
function getSpeakerColor(speaker?: string): string {
  if (!speaker) return 'text-foreground'
  
  const speakerLower = speaker.toLowerCase()
  if (speakerLower.includes('host')) {
    return 'text-blue-600 dark:text-blue-400'
  }
  if (speakerLower.includes('guest')) {
    return 'text-green-600 dark:text-green-400'
  }
  return 'text-foreground'
}

/**
 * Formats a single segment with speaker and timestamp
 */
function SegmentDisplay({
  segment,
  showTimestamp,
  search,
  index,
}: {
  segment: TranscriptSegment
  showTimestamp: boolean
  search: UseTranscriptSearchReturn
  index: number
}) {
  const segmentRef = useRef<HTMLDivElement>(null)
  const isCurrentMatch = search.currentMatchIndex >= 0 && 
    search.matches[search.currentMatchIndex]?.segmentIndex === index

  useEffect(() => {
    if (isCurrentMatch && segmentRef.current) {
      segmentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isCurrentMatch])

  const highlightedText = search.highlightText(segment.text, index)

  return (
    <div
      ref={segmentRef}
      className={cn(
        'mb-4 p-3 rounded-lg transition-colors',
        isCurrentMatch && 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-400'
      )}
    >
      <div className="flex flex-col gap-1">
        {segment.speaker && (
          <div className="flex items-center gap-2">
            <span className={cn('font-semibold text-sm', getSpeakerColor(segment.speaker))}>
              {segment.speaker}:
            </span>
            {showTimestamp && (
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(segment.start)}
              </span>
            )}
          </div>
        )}
        <p
          className="text-base leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedText }}
        />
      </div>
    </div>
  )
}

/**
 * Main transcript viewer component
 */
export function TranscriptViewer({
  transcript,
  videoTitle,
  className,
  search: externalSearch,
}: TranscriptViewerProps) {
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const internalSearch = useTranscriptSearch(transcript.segments)
  const search = externalSearch || internalSearch

  // Handle scroll to show/hide scroll to top button
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 400)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const handleCopy = async () => {
    try {
      const fullText = transcript.segments
        .map((segment) => {
          const speaker = segment.speaker ? `${segment.speaker}: ` : ''
          const timestamp = showTimestamps ? `[${formatTimestamp(segment.start)}] ` : ''
          return `${speaker}${timestamp}${segment.text}`
        })
        .join('\n\n')

      await copyToClipboard(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Search */}
      <TranscriptSearch search={search} />

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-timestamps"
              checked={showTimestamps}
              onCheckedChange={setShowTimestamps}
            />
            <Label htmlFor="show-timestamps" className="cursor-pointer">
              Show Timestamps
            </Label>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Transcript
            </>
          )}
        </Button>
      </div>

      {/* Transcript Content */}
      <Card>
        <CardContent className="pt-6">
          {videoTitle && (
            <h2 className="text-2xl font-bold mb-6 pb-4 border-b">{videoTitle}</h2>
          )}
          
          <div
            ref={containerRef}
            className="max-h-[600px] overflow-y-auto pr-4"
            style={{ scrollBehavior: 'smooth' }}
          >
            {transcript.segments.map((segment, index) => (
              <SegmentDisplay
                key={index}
                segment={segment}
                showTimestamp={showTimestamps}
                search={search}
                index={index}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-8 right-8 rounded-full shadow-lg"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

