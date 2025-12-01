'use client'

import { EmptyState } from './EmptyState'
import { Video } from 'lucide-react'

export interface NoVideosStateProps {
  type?: 'channel' | 'playlist'
  onRefresh?: () => void
  className?: string
}

/**
 * Empty state component for when no videos are found
 */
export function NoVideosState({
  type = 'channel',
  onRefresh,
  className,
}: NoVideosStateProps) {
  const typeLabel = type === 'channel' ? 'channel' : 'playlist'
  
  return (
    <EmptyState
      icon={Video}
      title={`No Videos Found`}
      description={`This ${typeLabel} does not have any videos available, or the videos are not accessible.`}
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
            }
          : undefined
      }
      className={className}
    />
  )
}

