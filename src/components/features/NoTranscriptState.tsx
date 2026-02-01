'use client'

import { EmptyState } from './EmptyState'
import { FileText } from 'lucide-react'

export interface NoTranscriptStateProps {
  videoTitle?: string
  onTryAnother?: () => void
  className?: string
}

/**
 * Empty state component for when a video has no transcript
 */
export function NoTranscriptState({
  videoTitle,
  onTryAnother,
  className,
}: NoTranscriptStateProps) {
  return (
    <EmptyState
      icon={FileText}
      title="No Transcript Available"
      description={
        videoTitle
          ? `"${videoTitle}" does not have captions or transcripts available. Try selecting a different video that has captions enabled.`
          : 'This video does not have captions or transcripts available. Try selecting a different video that has captions enabled.'
      }
      action={
        onTryAnother
          ? {
              label: 'Try Another Video',
              onClick: onTryAnother,
            }
          : undefined
      }
      className={className}
    />
  )
}

