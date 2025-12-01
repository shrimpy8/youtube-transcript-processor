'use client'

import { useMemo, memo, useState } from 'react'
import { usePlaylistData } from '@/hooks/usePlaylistData'
import { Loader2, ExternalLink, Copy, Check } from 'lucide-react'
import { ChannelVideoItem } from './ChannelVideoItem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/clipboard-utils'

interface PlaylistDetailsProps {
  playlistUrl: string
  onPasteUrl?: (url: string) => void
  className?: string
}

/**
 * Playlist details component that displays playlist information and top videos
 * Uses caching hook for performance optimization
 */
export const PlaylistDetails = memo(function PlaylistDetails({ 
  playlistUrl, 
  onPasteUrl,
  className 
}: PlaylistDetailsProps) {
  const [copied, setCopied] = useState(false)
  const { playlist: playlistData, isLoading, error } = usePlaylistData(playlistUrl)

  // Memoize playlist and videos to prevent unnecessary re-renders
  const playlist = useMemo(() => playlistData ?? null, [playlistData])
  const videos = useMemo(() => {
    if (!playlistData?.videos) return []
    // Sort by view count (descending) and take top 10
    return [...playlistData.videos]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10)
  }, [playlistData?.videos])

  const handleCopyPlaylistUrl = async () => {
    if (!playlist?.url) return
    try {
      await copyToClipboard(playlist.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy playlist URL:', error)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading playlist information...</span>
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
              Please try again or check the playlist URL.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!playlist) {
    return null
  }

  return (
    <div className={className}>
      {/* Playlist Info Section */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{playlist.title}</CardTitle>
              {playlist.videoCount !== undefined && (
                <CardDescription className="mt-1">
                  {playlist.videoCount} {playlist.videoCount === 1 ? 'video' : 'videos'}
                </CardDescription>
              )}
            </div>
            {playlist.url && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a 
                    href={playlist.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Playlist
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPlaylistUrl}
                  className="h-8 w-8 p-0"
                  title="Copy playlist URL"
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
      </Card>

      {/* Top Videos List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 10 Videos</CardTitle>
          <CardDescription>
            Videos sorted by view count
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No videos found for this playlist.
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

