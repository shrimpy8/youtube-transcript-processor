'use client'

import { ProcessedTranscript } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { formatDuration } from '@/lib/date-utils'

interface TranscriptStatsProps {
  transcript: ProcessedTranscript
  className?: string
}

/**
 * Statistics bar component for transcript
 */
export function TranscriptStats({ transcript, className }: TranscriptStatsProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Word Count</span>
            <span className="text-2xl font-bold">{transcript.wordCount.toLocaleString()}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="text-2xl font-bold">{formatDuration(transcript.totalDuration)}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Speakers</span>
            <span className="text-2xl font-bold">{transcript.speakers.length}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Segments</span>
            <span className="text-2xl font-bold">{transcript.segments.length.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}



