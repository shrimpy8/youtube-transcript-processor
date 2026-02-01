'use client'

import { useState, useCallback, useRef } from 'react'
import { Container } from "@/components/layout/Container"
import { VideoPreview } from "@/components/features/VideoPreview"
import { ProcessingOptions } from "@/components/features/ProcessingOptions"
import { ProcessingStatus } from "@/components/features/ProcessingStatus"
import { LoadingState } from "@/components/features/LoadingState"
import { SummarizePipelineModal } from "@/components/features/SummarizePipelineModal"
import { useProcessingOptions } from "@/hooks/useProcessingOptions"
import { useTranscriptProcessing } from "@/hooks/useTranscriptProcessing"
import { fetchTranscriptByUrlWithYtDlp, generateAISummary, fetchProviderConfig } from "@/lib/api-client"
import { extractVideoId, validateAndParseUrl } from "@/lib/youtube-validator"
import { VideoMetadata } from "@/components/features/VideoPreview"
import { TranscriptSegment, ProcessedTranscript, FavoriteChannelEpisode, PipelineStep, PipelineStepId, AISummaryResponse } from "@/types"
import { formatClientErrorMessage } from "@/lib/error-utils"
import { fetchChannelName, fetchPlaylistName } from "@/lib/url-type-helpers"
import { PIPELINE_STEP_LABELS, getYouTubeThumbnailUrl } from "@/lib/constants"

const PIPELINE_STEPS: PipelineStep[] = PIPELINE_STEP_LABELS.map((label, i) => ({
  id: (i + 1) as PipelineStepId,
  label,
  status: 'pending' as const,
}))

export default function Home() {
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null)
  const [rawSegments, setRawSegments] = useState<TranscriptSegment[] | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [urlType, setUrlType] = useState<'video' | 'playlist' | 'channel' | null>(null)

  // Channel/playlist detection
  const [detectedChannelUrl, setDetectedChannelUrl] = useState<string | null>(null)
  const [detectedPlaylistUrl, setDetectedPlaylistUrl] = useState<string | null>(null)
  const [channelName, setChannelName] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState<string | null>(null)
  const [isFetchingChannelInfo, setIsFetchingChannelInfo] = useState(false)
  const [isFetchingPlaylistInfo, setIsFetchingPlaylistInfo] = useState(false)
  const [externalUrl, setExternalUrl] = useState<string | null>(null)

  // Tab override for VideoPreview (set after pipeline navigates to AI Summary)
  const [activeTabOverride, setActiveTabOverride] = useState<string | null>(null)
  // Pre-generated summaries from pipeline step 4
  const [pipelineSummaries, setPipelineSummaries] = useState<AISummaryResponse[] | null>(null)

  // Pipeline modal state
  const [pipelineOpen, setPipelineOpen] = useState(false)
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(PIPELINE_STEPS)
  const [currentPipelineStep, setCurrentPipelineStep] = useState<PipelineStepId | null>(null)
  const failCountRef = useRef(0)
  const pipelineEpisodeRef = useRef<FavoriteChannelEpisode | null>(null)
  const prePipelineStateRef = useRef<{
    videoMetadata: VideoMetadata | null
    rawSegments: TranscriptSegment[] | null
    urlType: 'video' | 'playlist' | 'channel' | null
    currentUrl: string | null
  } | null>(null)

  const processingOptions = useProcessingOptions()
  const transcriptProcessing = useTranscriptProcessing()

  const handleUrlSubmit = async (url: string) => {
    setCurrentUrl(url)
    setExternalUrl(null)

    const validation = validateAndParseUrl(url)
    if (!validation.isValid) {
      setFetchError(validation.error || 'Invalid YouTube URL')
      return
    }

    const detectedType = validation.type
    setUrlType(detectedType)

    if (detectedType === 'playlist') {
      setDetectedPlaylistUrl(url)
      setDetectedChannelUrl(null)
      setChannelName(null)
      setVideoMetadata(null)
      setRawSegments(null)
      setFetchError(null)

      setIsFetchingPlaylistInfo(true)
      try {
        const name = await fetchPlaylistName(url)
        setPlaylistName(name)
      } catch {
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

      setIsFetchingChannelInfo(true)
      try {
        const name = await fetchChannelName(url)
        setChannelName(name)
      } catch {
        setChannelName('Channel')
      } finally {
        setIsFetchingChannelInfo(false)
      }
      return
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      setFetchError('Invalid video ID')
      return
    }

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
  }

  const handleProcessTranscript = async () => {
    if (!rawSegments || rawSegments.length === 0) {
      setFetchError('No transcript segments available.')
      return
    }
    await transcriptProcessing.process(rawSegments, processingOptions.options)
  }

  const handleReProcess = async () => {
    if (!rawSegments) return
    await transcriptProcessing.process(rawSegments, processingOptions.options)
  }

  const handleClearDetectionMessage = () => {
    setDetectedChannelUrl(null)
    setDetectedPlaylistUrl(null)
    setChannelName(null)
    setPlaylistName(null)
    setUrlType(null)
  }

  const handleCopyUrl = (url: string) => {
    setExternalUrl(url)
    handleClearDetectionMessage()
  }

  // ---- Pipeline orchestration ----

  const updateStep = useCallback((stepId: PipelineStepId, update: Partial<PipelineStep>) => {
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...update } : s))
    )
  }, [])

  const runPipeline = useCallback(
    async (episode: FavoriteChannelEpisode, startFrom: PipelineStepId = 1) => {
      setCurrentPipelineStep(startFrom)
      // Local variables to pass data between steps within the same run
      // (avoids stale closure on React state)
      let pipelineSegments: TranscriptSegment[] = rawSegments || []
      let pipelineProcessedResult: ProcessedTranscript | null = null

      try {
        // Step 1: Fetch transcript
        if (startFrom <= 1) {
          updateStep(1, { status: 'in_progress' })
          setCurrentPipelineStep(1)

          const response = await fetchTranscriptByUrlWithYtDlp(episode.url)
          if (!response.success || !response.data || !response.data.segments?.length) {
            const errMsg = response.error || "This video doesn't have captions available."
            updateStep(1, { status: 'failed', error: errMsg })
            return
          }

          pipelineSegments = response.data.segments
          setRawSegments(pipelineSegments)
          setVideoMetadata({
            id: response.data.videoId,
            title: response.data.title || episode.title,
            url: episode.url,
            thumbnail: response.data.thumbnail || getYouTubeThumbnailUrl(response.data.videoId),
            channelTitle: response.data.channelTitle,
            publishedAt: response.data.publishedAt,
            duration: response.data.duration,
          })
          updateStep(1, { status: 'completed' })
        }

        // Step 2: Process transcript
        if (startFrom <= 2) {
          updateStep(2, { status: 'in_progress' })
          setCurrentPipelineStep(2)

          if (pipelineSegments.length === 0) {
            updateStep(2, { status: 'failed', error: 'No transcript segments to process.' })
            return
          }

          const processed = await transcriptProcessing.process(pipelineSegments, processingOptions.options)
          if (!processed) {
            updateStep(2, { status: 'failed', error: 'Transcript processing failed.' })
            return
          }
          // Store processed result locally for step 4
          pipelineProcessedResult = processed
          updateStep(2, { status: 'completed' })
        }

        // Step 3: Set metadata (synchronous)
        if (startFrom <= 3) {
          updateStep(3, { status: 'in_progress' })
          setCurrentPipelineStep(3)
          // Metadata already set in step 1
          updateStep(3, { status: 'completed' })
        }

        // Step 4: Generate AI summary
        if (startFrom <= 4) {
          updateStep(4, { status: 'in_progress' })
          setCurrentPipelineStep(4)

          // Check if providers are configured
          const config = await fetchProviderConfig()
          const configuredKeys = (Object.keys(config) as Array<keyof typeof config>).filter(k => config[k])
          if (configuredKeys.length === 0) {
            updateStep(4, {
              status: 'failed',
              error: 'No AI providers configured. Add an API key in your .env.local file.',
            })
            return
          }

          // Build transcript text from local processed result (avoids stale closure)
          const processedData = pipelineProcessedResult || transcriptProcessing.result
          const transcriptText =
            processedData?.segments.map((s) => s.text).join('\n') || ''

          if (!transcriptText) {
            updateStep(4, { status: 'failed', error: 'No transcript text available for summary.' })
            return
          }

          // Only request configured providers (avoids timeout on unconfigured ones)
          const providerArg = configuredKeys.length === 3 ? 'all' as const : configuredKeys[0]
          let allResults: AISummaryResponse[] = []

          if (configuredKeys.length === 1 || configuredKeys.length === 3) {
            // Single provider or all three — one API call
            allResults = await generateAISummary(transcriptText, providerArg, 'bullets', episode.url)
          } else {
            // 2 of 3 configured — parallel individual calls
            const results = await Promise.all(
              configuredKeys.map(p => generateAISummary(transcriptText, p, 'bullets', episode.url))
            )
            allResults = results.flat()
          }

          setPipelineSummaries(allResults)
          updateStep(4, { status: 'completed' })
        }

        // Step 5: Navigate to AI Summary Bullet tab
        if (startFrom <= 5) {
          updateStep(5, { status: 'in_progress' })
          setCurrentPipelineStep(5)
          // Set URL type so the right column shows
          setUrlType('video')
          setCurrentUrl(episode.url)
          // Navigate to AI Summary tab per PRD requirement
          setActiveTabOverride('ai-summary')
          updateStep(5, { status: 'completed' })
        }

        // All done — auto-dismiss after 500ms
        setCurrentPipelineStep(null)
        setTimeout(() => {
          setPipelineOpen(false)
          failCountRef.current = 0
        }, 500)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred'
        const currentStepVal = currentPipelineStep || startFrom
        if (failCountRef.current >= 1) {
          updateStep(currentStepVal, {
            status: 'failed',
            error: 'Something went wrong. Please try again later.',
          })
        } else {
          updateStep(currentStepVal, { status: 'failed', error: msg })
        }
      }
    },
    [updateStep, rawSegments, transcriptProcessing, processingOptions.options, currentPipelineStep]
  )

  const handleSummarize = useCallback(
    (episode: FavoriteChannelEpisode) => {
      // Capture pre-pipeline state for rollback on failure close
      prePipelineStateRef.current = {
        videoMetadata,
        rawSegments,
        urlType,
        currentUrl,
      }
      pipelineEpisodeRef.current = episode
      failCountRef.current = 0
      setPipelineSteps(PIPELINE_STEPS.map((s) => ({ ...s, status: 'pending' as const, error: undefined })))
      setPipelineOpen(true)
      runPipeline(episode, 1)
    },
    [runPipeline, videoMetadata, rawSegments, urlType, currentUrl]
  )

  const handlePipelineRetry = useCallback(() => {
    failCountRef.current++
    const failedStep = pipelineSteps.find((s) => s.status === 'failed')
    if (failedStep && pipelineEpisodeRef.current) {
      // Reset failed and pending steps
      setPipelineSteps((prev) =>
        prev.map((s) =>
          s.id >= failedStep.id ? { ...s, status: 'pending' as const, error: undefined } : s
        )
      )
      runPipeline(pipelineEpisodeRef.current, failedStep.id)
    }
  }, [pipelineSteps, runPipeline])

  const handlePipelineClose = useCallback(() => {
    // Roll back partial state changes from failed pipeline
    const hasFailed = pipelineSteps.some((s) => s.status === 'failed')
    if (hasFailed && prePipelineStateRef.current) {
      const prev = prePipelineStateRef.current
      setVideoMetadata(prev.videoMetadata)
      setRawSegments(prev.rawSegments)
      setUrlType(prev.urlType)
      setCurrentUrl(prev.currentUrl)
      setActiveTabOverride(null)
      setPipelineSummaries(null)
      transcriptProcessing.reset()
    }
    prePipelineStateRef.current = null
    setPipelineOpen(false)
    failCountRef.current = 0
    pipelineEpisodeRef.current = null
  }, [pipelineSteps, transcriptProcessing])

  const detectionMessage = detectedChannelUrl && channelName
    ? { type: 'channel' as const, name: channelName, url: detectedChannelUrl }
    : detectedPlaylistUrl && playlistName
    ? { type: 'playlist' as const, name: playlistName, url: detectedPlaylistUrl }
    : null

  return (
    <Container className="py-12">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="flex flex-col gap-6">
            <ProcessingOptions
              onSubmit={handleUrlSubmit}
              detectionMessage={detectionMessage}
              onCopyUrl={handleCopyUrl}
              externalUrl={externalUrl}
              onExternalUrlCleared={() => setExternalUrl(null)}
              onClearDetectionMessage={handleClearDetectionMessage}
              onSummarize={handleSummarize}
            />
          </div>

          {/* Right Column - Outputs */}
          <div className="flex flex-col gap-6">
            {(urlType === 'video' || detectedChannelUrl || detectedPlaylistUrl) ? (
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
                  activeTabOverride={activeTabOverride}
                  preGeneratedSummaries={pipelineSummaries}
                />

                {transcriptProcessing.state === 'processing' && (
                  <ProcessingStatus
                    state="processing"
                    progress={transcriptProcessing.progress}
                    onCancel={transcriptProcessing.cancel}
                  />
                )}

                {isFetchingTranscript && (
                  <LoadingState message="Fetching transcript..." />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                <p className="text-sm">Paste a YouTube video, channel, or playlist URL to get started.</p>
              </div>
            )}

            {transcriptProcessing.error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-destructive font-medium">Processing Error</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {transcriptProcessing.error}
                </p>
                {rawSegments && (
                  <button
                    type="button"
                    onClick={handleReProcess}
                    className="mt-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summarize Pipeline Modal */}
      <SummarizePipelineModal
        isOpen={pipelineOpen}
        steps={pipelineSteps}
        currentStep={currentPipelineStep}
        onRetry={handlePipelineRetry}
        onClose={handlePipelineClose}
        isSecondFailure={failCountRef.current >= 1}
      />
    </Container>
  )
}
