'use client'

import { useState } from 'react'
import { Container } from "@/components/layout/Container"
import { VideoPreview } from "@/components/features/VideoPreview"
import { ProcessingOptions } from "@/components/features/ProcessingOptions"
import { ProcessingStatus } from "@/components/features/ProcessingStatus"
import { LoadingState } from "@/components/features/LoadingState"
import { useProcessingOptions } from "@/hooks/useProcessingOptions"
import { useTranscriptProcessing } from "@/hooks/useTranscriptProcessing"
import { fetchTranscriptByUrlWithYtDlp } from "@/lib/api-client"
import { extractVideoId, validateAndParseUrl } from "@/lib/youtube-validator"
import { VideoMetadata } from "@/components/features/VideoPreview"
import { TranscriptSegment } from "@/types"
import { formatClientErrorMessage } from "@/lib/error-utils"
import { fetchChannelName, fetchPlaylistName } from "@/lib/url-type-helpers"

export default function Home() {
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null)
  const [rawSegments, setRawSegments] = useState<TranscriptSegment[] | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [urlType, setUrlType] = useState<'video' | 'playlist' | 'channel' | null>(null)
  
  // New state for channel/playlist detection
  const [detectedChannelUrl, setDetectedChannelUrl] = useState<string | null>(null)
  const [detectedPlaylistUrl, setDetectedPlaylistUrl] = useState<string | null>(null)
  const [channelName, setChannelName] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState<string | null>(null)
  const [isFetchingChannelInfo, setIsFetchingChannelInfo] = useState(false)
  const [isFetchingPlaylistInfo, setIsFetchingPlaylistInfo] = useState(false)
  const [externalUrl, setExternalUrl] = useState<string | null>(null)

  const processingOptions = useProcessingOptions()
  const transcriptProcessing = useTranscriptProcessing()

  // Search will be handled internally by TranscriptViewer

  const handleUrlSubmit = async (url: string) => {
    setCurrentUrl(url)
    // Clear external URL state when user submits a new URL
    setExternalUrl(null)
    
    // Validate URL and determine type
    const validation = validateAndParseUrl(url)
    if (!validation.isValid) {
      setFetchError(validation.error || 'Invalid YouTube URL')
      return
    }

    const detectedType = validation.type
    setUrlType(detectedType)

    // Handle playlist/channel URLs - fetch info and show detection message
    if (detectedType === 'playlist') {
      setDetectedPlaylistUrl(url)
      setDetectedChannelUrl(null)
      setChannelName(null)
      setVideoMetadata(null)
      setRawSegments(null)
      setFetchError(null)
      
      // Fetch playlist info to get name
      setIsFetchingPlaylistInfo(true)
      try {
        const name = await fetchPlaylistName(url)
        setPlaylistName(name)
      } catch (error) {
        console.error('Failed to fetch playlist info:', error)
        setPlaylistName('Playlist')
      } finally {
        setIsFetchingPlaylistInfo(false)
      }
      return
    }

    if (detectedType === 'channel') {
      setDetectedChannelUrl(url)
      setDetectedPlaylistUrl(null)
      setPlaylistName(null)
      setVideoMetadata(null)
      setRawSegments(null)
      setFetchError(null)
      
      // Fetch channel info to get name
      setIsFetchingChannelInfo(true)
      try {
        const name = await fetchChannelName(url)
        setChannelName(name)
      } catch (error) {
        console.error('Failed to fetch channel info:', error)
        setChannelName('Channel')
      } finally {
        setIsFetchingChannelInfo(false)
      }
      return
    }

    // Handle single video URLs
    const videoId = extractVideoId(url)
    if (!videoId) {
      setFetchError('Invalid video ID')
      return
    }

    // Clear channel/playlist detection when video URL is entered
    setDetectedChannelUrl(null)
    setDetectedPlaylistUrl(null)
    setChannelName(null)
    setPlaylistName(null)

    setIsFetchingTranscript(true)
    setFetchError(null)
    setErrorSuggestion(null)
    setVideoMetadata(null)
    setRawSegments(null)
    transcriptProcessing.reset()

    try {
      // Fetch transcript using yt-dlp
      const response = await fetchTranscriptByUrlWithYtDlp(url)
      
      // Check for error response first
      if (!response.success) {
        // Store suggestion if available
        if (response.suggestion) {
          setErrorSuggestion(response.suggestion)
        }
        // Set error message based on error type
        const errorMsg = response.error || 'Failed to fetch transcript'
        setFetchError(errorMsg)
        console.error('Transcript fetch failed:', {
          type: response.type,
          error: errorMsg,
          suggestion: response.suggestion,
        })
        // Don't throw - let the error state be displayed
        return
      }

      // Check if response data exists
      if (!response.data) {
        throw new Error('No transcript data received from server')
      }

      // Check if segments exist and are not empty
      if (!response.data.segments || !Array.isArray(response.data.segments) || response.data.segments.length === 0) {
        throw new Error('This video does not have captions available. Please try a video with captions enabled.')
      }

      // Set video metadata from API response
      setVideoMetadata({
        id: response.data.videoId,
        title: response.data.title || `Video ${response.data.videoId}`,
        url: url,
        thumbnail: response.data.thumbnail || `https://img.youtube.com/vi/${response.data.videoId}/maxresdefault.jpg`,
        channelTitle: response.data.channelTitle,
        publishedAt: response.data.publishedAt,
        duration: response.data.duration,
      })

      // Store raw segments for processing
      setRawSegments(response.data.segments)
      console.log(`Loaded ${response.data.segments.length} transcript segments`)
    } catch (error: unknown) {
      const errorMessage = formatClientErrorMessage(error, 'Failed to fetch transcript')
      setFetchError(errorMessage)
      console.error('Transcript fetch error:', error)
      // Clear any partial state
      setVideoMetadata(null)
      setRawSegments(null)
    } finally {
      setIsFetchingTranscript(false)
    }
  }

  const handleProcessTranscript = async () => {
    if (!rawSegments || rawSegments.length === 0) {
      setFetchError('No transcript segments available. Please fetch the transcript first.')
      console.error('Process attempted but no segments available:', { rawSegments })
      return
    }

    console.log(`Processing ${rawSegments.length} segments with options:`, processingOptions.options)
    await transcriptProcessing.process(rawSegments, processingOptions.options)
  }

  const handleReProcess = async () => {
    if (!rawSegments) return
    await transcriptProcessing.process(rawSegments, processingOptions.options)
  }

  const handleClearDetectionMessage = () => {
    // Clear detection message when user manually changes the URL
    setDetectedChannelUrl(null)
    setDetectedPlaylistUrl(null)
    setChannelName(null)
    setPlaylistName(null)
    setUrlType(null)
  }

  const handleCopyUrl = (url: string) => {
    // Set the external URL which will be synced to UrlInput component
    setExternalUrl(url)
    // Clear detection message when a video URL is pasted (user is switching from channel/playlist to video)
    handleClearDetectionMessage()
    console.log('URL copied to input:', url)
  }

  // Determine detection message to show
  const detectionMessage = detectedChannelUrl && channelName
    ? { type: 'channel' as const, name: channelName, url: detectedChannelUrl }
    : detectedPlaylistUrl && playlistName
    ? { type: 'playlist' as const, name: playlistName, url: detectedPlaylistUrl }
    : null

  return (
    <Container className="py-12">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-bold mb-2">YouTube Podcast Transcript Processor</h1>
          <p className="text-muted-foreground">
            Extract, process, and export YouTube podcast transcripts with advanced features
          </p>
        </div>
        
        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="flex flex-col gap-6">
            {/* Processing Options with integrated URL Input */}
            <ProcessingOptions 
              onSubmit={handleUrlSubmit}
              detectionMessage={detectionMessage}
              onCopyUrl={handleCopyUrl}
              externalUrl={externalUrl}
              onExternalUrlCleared={() => setExternalUrl(null)}
              onClearDetectionMessage={handleClearDetectionMessage}
            />
          </div>

          {/* Right Column - Outputs */}
          <div className="flex flex-col gap-6">
            {/* Video Preview - show for videos, channels, or playlists */}
            {(urlType === 'video' || detectedChannelUrl || detectedPlaylistUrl) && (
              <>
                <VideoPreview
                  metadata={videoMetadata}
                  isLoading={isFetchingTranscript || isFetchingChannelInfo || isFetchingPlaylistInfo}
                  error={fetchError}
                  errorSuggestion={errorSuggestion}
                  onProcess={rawSegments ? handleProcessTranscript : undefined}
                  transcript={transcriptProcessing.result}
                  onReProcess={transcriptProcessing.result ? handleReProcess : undefined}
                  onPasteUrl={handleCopyUrl}
                  channelUrl={detectedChannelUrl}
                  playlistUrl={detectedPlaylistUrl}
                />

                {/* Processing Status */}
                {transcriptProcessing.state === 'processing' && (
                  <ProcessingStatus
                    progress={transcriptProcessing.progress}
                    onCancel={transcriptProcessing.cancel}
                  />
                )}

                {/* Loading State */}
                {isFetchingTranscript && (
                  <LoadingState message="Fetching transcript..." />
                )}
              </>
            )}

            {/* Error Display */}
            {transcriptProcessing.error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-destructive font-medium">Processing Error</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {transcriptProcessing.error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}
