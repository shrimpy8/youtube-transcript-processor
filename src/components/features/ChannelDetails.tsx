'use client'

import { useMemo, memo, useState } from 'react'
import { useChannelData } from '@/hooks/useChannelData'
import { Loader2, ExternalLink, Copy, Check } from 'lucide-react'
import { ChannelVideoItem } from './ChannelVideoItem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/clipboard-utils'

interface ChannelDetailsProps {
  videoUrl?: string | null
  channelUrl?: string | null
  onPasteUrl?: (url: string) => void
  className?: string
}

/**
 * Channel details component that displays channel information and top videos
 * Uses caching hook for performance optimization
 * Can accept either a video URL (derives channel) or a direct channel URL
 */
export const ChannelDetails = memo(function ChannelDetails({ 
  videoUrl,
  channelUrl,
  onPasteUrl,
  className 
}: ChannelDetailsProps) {
  const [copied, setCopied] = useState(false)
  
  // Use channelUrl if provided, otherwise fall back to videoUrl
  const urlToUse = channelUrl || videoUrl || null
  const { channel: channelData, isLoading, error } = useChannelData(urlToUse, channelUrl ? 'channel' : 'video')

  // Memoize channel and videos to prevent unnecessary re-renders
  const channel = useMemo(() => channelData?.channel ?? null, [channelData?.channel])
  const videos = useMemo(() => channelData?.videos ?? [], [channelData?.videos])

  const handleCopyChannelUrl = async () => {
    if (!channel?.url) return
    try {
      await copyToClipboard(channel.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy channel URL:', error)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading channel information...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="text-center">
            <p className="text-destructive mb-2 font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">
              Please try again or check the video URL.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!channel) {
    return null
  }

  return (
    <div className={className}>
      {/* Channel Info Section */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{channel.name}</CardTitle>
              {channel.videoCount !== undefined && (
                <CardDescription className="mt-1">
                  {channel.videoCount} {channel.videoCount === 1 ? 'video' : 'videos'}
                </CardDescription>
              )}
            </div>
            {channel.url && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a 
                    href={channel.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Channel
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyChannelUrl}
                  className="h-8 w-8 p-0"
                  title="Copy channel URL"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        {channel.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {channel.description}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Top Videos List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 10 Videos</CardTitle>
          <CardDescription>
            Most recent videos from this channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No videos found for this channel.
            </p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {videos.map((video, index) => (
                <ChannelVideoItem
                  key={video.id}
                  video={video}
                  rank={index + 1}
                  onPasteUrl={onPasteUrl}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

