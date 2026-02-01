'use client'

import { useState, useCallback } from 'react'
import { fetchTranscriptByUrlWithYtDlp } from '@/lib/api-client'
import { extractVideoId, validateAndParseUrl } from '@/lib/youtube-validator'
import { VideoMetadata } from '@/components/features/VideoPreview'
import { TranscriptSegment } from '@/types'
import { formatClientErrorMessage } from '@/lib/error-utils'
import { getYouTubeThumbnailUrl } from '@/lib/constants'

export interface UseUrlSubmissionReturn {
  videoMetadata: VideoMetadata | null
  isFetchingTranscript: boolean
  fetchError: string | null
  errorSuggestion: string | null
  rawSegments: TranscriptSegment[] | null
  currentUrl: string | null
  urlType: 'video' | 'playlist' | 'channel' | null

  handleUrlSubmit: (url: string) => Promise<void>

  // Setters exposed for pipeline cross-hook writes
  setVideoMetadata: React.Dispatch<React.SetStateAction<VideoMetadata | null>>
  setRawSegments: React.Dispatch<React.SetStateAction<TranscriptSegment[] | null>>
  setCurrentUrl: React.Dispatch<React.SetStateAction<string | null>>
  setUrlType: React.Dispatch<React.SetStateAction<'video' | 'playlist' | 'channel' | null>>
  setFetchError: React.Dispatch<React.SetStateAction<string | null>>
}

interface UseUrlSubmissionDeps {
  transcriptProcessingReset: () => void
  onChannelDetected: (url: string) => Promise<void>
  onPlaylistDetected: (url: string) => Promise<void>
  clearExternalUrl: () => void
  clearDetection: () => void
}

export function useUrlSubmission(deps: UseUrlSubmissionDeps): UseUrlSubmissionReturn {
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null)
  const [rawSegments, setRawSegments] = useState<TranscriptSegment[] | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [urlType, setUrlType] = useState<'video' | 'playlist' | 'channel' | null>(null)

  const resetVideoState = useCallback(() => {
    setVideoMetadata(null)
    setRawSegments(null)
    setFetchError(null)
    setErrorSuggestion(null)
  }, [])

  const handleUrlSubmit = useCallback(async (url: string) => {
    setCurrentUrl(url)
    deps.clearExternalUrl()

    const validation = validateAndParseUrl(url)
    if (!validation.isValid) {
      setFetchError(validation.error || 'Invalid YouTube URL')
      return
    }

    const detectedType = validation.type
    setUrlType(detectedType)

    if (detectedType === 'playlist') {
      resetVideoState()
      await deps.onPlaylistDetected(url)
      return
    }

    if (detectedType === 'channel') {
      resetVideoState()
      await deps.onChannelDetected(url)
      return
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      setFetchError('Invalid video ID')
      return
    }

    deps.clearDetection()

    setIsFetchingTranscript(true)
    setFetchError(null)
    setErrorSuggestion(null)
    setVideoMetadata(null)
    setRawSegments(null)
    deps.transcriptProcessingReset()

    try {
      const response = await fetchTranscriptByUrlWithYtDlp(url)

      if (!response.success) {
        if (response.suggestion) setErrorSuggestion(response.suggestion)
        setFetchError(response.error || 'Failed to fetch transcript')
        return
      }

      if (!response.data) {
        throw new Error('No transcript data received from server')
      }

      if (!response.data.segments || response.data.segments.length === 0) {
        throw new Error('This video does not have captions available.')
      }

      setVideoMetadata({
        id: response.data.videoId,
        title: response.data.title || `Video ${response.data.videoId}`,
        url: url,
        thumbnail: response.data.thumbnail || getYouTubeThumbnailUrl(response.data.videoId),
        channelTitle: response.data.channelTitle,
        publishedAt: response.data.publishedAt,
        duration: response.data.duration,
      })

      setRawSegments(response.data.segments)
    } catch (error: unknown) {
      const errorMessage = formatClientErrorMessage(error, 'Failed to fetch transcript')
      setFetchError(errorMessage)
      setVideoMetadata(null)
      setRawSegments(null)
    } finally {
      setIsFetchingTranscript(false)
    }
  }, [deps, resetVideoState])

  return {
    videoMetadata,
    isFetchingTranscript,
    fetchError,
    errorSuggestion,
    rawSegments,
    currentUrl,
    urlType,
    handleUrlSubmit,
    setVideoMetadata,
    setRawSegments,
    setCurrentUrl,
    setUrlType,
    setFetchError,
  }
}
