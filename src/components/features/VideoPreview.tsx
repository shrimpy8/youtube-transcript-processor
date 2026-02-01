'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, ExternalLink, Play, Sparkles, User, ListVideo, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import { ChannelDetails } from './ChannelDetails'
import { PlaylistDetails } from './PlaylistDetails'
import { TranscriptViewer } from './TranscriptViewer'
import { TranscriptStats } from './TranscriptStats'
import { ExportControls } from './ExportControls'
import { AISummary } from './AISummary'
import { ProcessedTranscript, AISummaryResponse } from '@/types'
import { formatDuration as formatDurationUtil, formatDate as formatDateUtil } from '@/lib/date-utils'

export interface VideoMetadata {
  id: string
  title: string
  url: string
  publishedAt?: string
  duration?: number
  thumbnail?: string
  channelTitle?: string
  description?: string
}

interface VideoPreviewProps {
  metadata: VideoMetadata | null
  isLoading?: boolean
  error?: string | null
  errorSuggestion?: string | null
  onProcess?: () => void
  onPasteUrl?: (url: string) => void
  transcript?: ProcessedTranscript | null
  onReProcess?: () => void
  channelUrl?: string | null
  playlistUrl?: string | null
  activeTabOverride?: string | null
  preGeneratedSummaries?: AISummaryResponse[] | null
}

/**
 * Video preview component that displays video metadata
 */
export function VideoPreview({ 
  metadata, 
  isLoading = false, 
  error,
  errorSuggestion,
  onProcess,
  onPasteUrl,
  transcript,
  onReProcess,
  channelUrl,
  playlistUrl,
  activeTabOverride,
  preGeneratedSummaries
}: VideoPreviewProps) {
  const [activeTab, setActiveTab] = useState('video')

  // Allow parent to override the active tab (e.g., after pipeline completion)
  useEffect(() => {
    if (activeTabOverride) {
      setActiveTab(activeTabOverride)
    }
  }, [activeTabOverride])

  // Reset to 'video' tab when video metadata changes (new video loaded)
  useEffect(() => {
    if (metadata?.id && !activeTabOverride) {
      setActiveTab('video')
    }
  }, [metadata?.id, activeTabOverride])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Determine which tabs to show
  const showChannelTab = channelUrl || metadata?.url
  const showPlaylistTab = playlistUrl
  const tabCount = 1 + (transcript ? 1 : 0) + (showChannelTab ? 1 : 0) + (showPlaylistTab ? 1 : 0)
  
  // Generate grid class based on tab count
  const gridClass = 
    tabCount === 1 ? 'grid-cols-1' :
    tabCount === 2 ? 'grid-cols-2' :
    tabCount === 3 ? 'grid-cols-3' :
    'grid-cols-4'

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading video information...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center">
            <p className="text-destructive mb-4 font-medium">{error}</p>
            {errorSuggestion && (
              <p className="text-sm text-muted-foreground mb-2">
                {errorSuggestion}
              </p>
            )}
            {!errorSuggestion && (
              <p className="text-sm text-muted-foreground">
                Please check the URL and try again.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show component if we have metadata, channel URL, or playlist URL
  if (!metadata && !channelUrl && !playlistUrl) {
    return null
  }

  // Use centralized date utilities
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown'
    return formatDurationUtil(seconds)
  }

  const formatDate = (dateString?: string): string => {
    return formatDateUtil(dateString)
  }

  return (
    <Card>
      <CardHeader>
        {/* Video metadata at the top right */}
        {metadata && (
          <div className="flex flex-col gap-2">
            {metadata.title && (
              <CardTitle className="line-clamp-2 text-lg">{metadata.title}</CardTitle>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {metadata.publishedAt && (
                <span>{formatDate(metadata.publishedAt)}</span>
              )}
              {metadata.channelTitle && (
                <>
                  {metadata.publishedAt && <span>•</span>}
                  <span>{metadata.channelTitle}</span>
                </>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full ${gridClass}`}>
            <TabsTrigger value="video"><Play className="h-4 w-4" /><span className="hidden sm:inline">Video</span></TabsTrigger>
            {transcript && <TabsTrigger value="ai-summary"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">AI Summary</span></TabsTrigger>}
            {showChannelTab && <TabsTrigger value="channel"><User className="h-4 w-4" /><span className="hidden sm:inline">Channel</span></TabsTrigger>}
            {showPlaylistTab && <TabsTrigger value="playlist"><ListVideo className="h-4 w-4" /><span className="hidden sm:inline">Playlist</span></TabsTrigger>}
          </TabsList>
          
          {/* Video Tab - shows preview and transcript */}
          <TabsContent value="video" className="space-y-4 mt-4">
            {metadata ? (
              <>
                {/* Always show preview section at top */}
                <div className="space-y-4">
                  {metadata.thumbnail && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                      <Image
                        src={metadata.thumbnail}
                        alt={metadata.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-end gap-4 text-sm">
                    {metadata.duration && (
                      <div>
                        <span className="font-medium">Duration:</span>{' '}
                        <span className="text-muted-foreground">{formatDuration(metadata.duration)}</span>
                      </div>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Episode
                      </a>
                    </Button>
                  </div>

                  {!transcript && onProcess && (
                    <Button 
                      onClick={onProcess} 
                      className="w-full"
                      size="lg"
                    >
                      Extract Transcript
                    </Button>
                  )}
                </div>

                {/* Show transcript if available */}
                {transcript && (
                  <div className="space-y-6 mt-6">
                    {/* Statistics */}
                    <TranscriptStats transcript={transcript} />

                    {/* Transcript Viewer with Search */}
                    <TranscriptViewer
                      transcript={transcript}
                      videoTitle={metadata?.title || 'Video'}
                    />

                    {/* Export Controls */}
                    <ExportControls
                      transcript={transcript}
                      videoTitle={metadata?.title || 'Video'}
                    />

                    {/* Re-process Button */}
                    {onReProcess && (
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onReProcess}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Re-process with current options
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No video selected. Use the Channel or Playlist tab to browse videos.</p>
              </div>
            )}
          </TabsContent>
          
          {/* AI Summary Tab - only show when transcript is available */}
          {transcript && metadata && (
            <TabsContent value="ai-summary" className="mt-4">
              <AISummary
                transcript={transcript}
                videoTitle={metadata.title}
                videoUrl={metadata.url}
                preGeneratedSummaries={preGeneratedSummaries}
              />
            </TabsContent>
          )}

          {/* Channel Tab - forceMount keeps component mounted to preserve cache */}
          {showChannelTab && (
            <TabsContent value="channel" className="mt-4" forceMount>
              <div className={activeTab !== 'channel' ? 'hidden' : ''}>
                <ChannelDetails
                  videoUrl={metadata?.url || null}
                  channelUrl={channelUrl || null}
                  onPasteUrl={onPasteUrl}
                />
              </div>
            </TabsContent>
          )}

          {/* Playlist Tab - only shows playlist videos */}
          {showPlaylistTab && (
            <TabsContent value="playlist" className="mt-4">
              {playlistUrl && (
                <PlaylistDetails 
                  playlistUrl={playlistUrl} 
                  onPasteUrl={onPasteUrl}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}



