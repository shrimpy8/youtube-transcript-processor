'use client'

import { VideoMetadata } from '@/types'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { useState, memo, useMemo } from 'react'
import { copyToClipboard } from '@/lib/clipboard-utils'
import Image from 'next/image'
import { cn, formatViewCount } from '@/lib/utils'
import { formatDuration as formatDurationUtil, formatDate as formatDateUtil } from '@/lib/date-utils'

interface ChannelVideoItemProps {
  video: VideoMetadata
  rank?: number
  onPasteUrl?: (url: string) => void
  className?: string
}

/**
 * Individual video item in channel video list
 * Memoized to prevent unnecessary re-renders
 */
export const ChannelVideoItem = memo(function ChannelVideoItem({ 
  video, 
  rank,
  onPasteUrl,
  className 
}: ChannelVideoItemProps) {
  const [copied, setCopied] = useState(false)
  const [pasted, setPasted] = useState(false)
  
  // Use rank prop if provided, otherwise fall back to video.rank
  const displayRank = rank ?? video.rank

  // Memoize formatted values to prevent recalculation on every render
  const formattedDate = useMemo(() => formatDateUtil(video.publishedAt), [video.publishedAt])
  const formattedDuration = useMemo(() => {
    if (!video.duration) return ''
    return formatDurationUtil(video.duration)
  }, [video.duration])
  const formattedViewCount = useMemo(() => formatViewCount(video.viewCount), [video.viewCount])

  const handleCopy = async () => {
    try {
      await copyToClipboard(video.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const handlePaste = async () => {
    if (onPasteUrl) {
      // Copy to clipboard first
      try {
        await copyToClipboard(video.url)
      } catch (error) {
        console.error('Failed to copy URL:', error)
      }
      // Auto-paste into input field
      onPasteUrl(video.url)
      setPasted(true)
      setTimeout(() => setPasted(false), 2000)
    }
  }

  return (
    <div className={cn('flex gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors', className)}>
      {/* Ranking Badge */}
      {displayRank !== undefined && (
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
          displayRank === 1 ? 'bg-yellow-500 text-yellow-950' :
          displayRank === 2 ? 'bg-gray-400 text-gray-950' :
          displayRank === 3 ? 'bg-amber-600 text-amber-50' :
          'bg-muted text-muted-foreground'
        )}>
          {displayRank}
        </div>
      )}
      
      {/* Thumbnail */}
      {video.thumbnail && (
        <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden">
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm line-clamp-2 mb-1">{video.title}</h4>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
          {formattedDate && (
            <span className="font-medium">{formattedDate}</span>
          )}
          {video.viewCount !== undefined && (
            <>
              {formattedDate && <span>•</span>}
              <span className="font-medium">{formattedViewCount} views</span>
            </>
          )}
          {formattedDuration && (
            <>
              {(formattedDate || video.viewCount !== undefined) && <span>•</span>}
              <span>{formattedDuration}</span>
            </>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy URL
              </>
            )}
          </Button>
          
          {onPasteUrl && (
            <Button
              variant="default"
              size="sm"
              onClick={handlePaste}
              className="h-7 text-xs"
            >
              {pasted ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Pasted
                </>
              ) : (
                'Paste URL'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

