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
import { useUrlDetection } from "@/hooks/useUrlDetection"
import { useUrlSubmission } from "@/hooks/useUrlSubmission"
import { fetchTranscriptByUrlWithYtDlp, generateAISummary, fetchProviderConfig } from "@/lib/api-client"
import { VideoMetadata } from "@/components/features/VideoPreview"
import { TranscriptSegment, ProcessedTranscript, FavoriteChannelEpisode, PipelineStep, PipelineStepId, AISummaryResponse } from "@/types"
import { PIPELINE_STEP_LABELS, getYouTubeThumbnailUrl } from "@/lib/constants"

const PIPELINE_STEPS: PipelineStep[] = PIPELINE_STEP_LABELS.map((label, i) => ({
  id: (i + 1) as PipelineStepId,
  label,
  status: 'pending' as const,
}))

export default function Home() {
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
  const detection = useUrlDetection()

  const urlSubmission = useUrlSubmission({
    transcriptProcessingReset: transcriptProcessing.reset,
    onChannelDetected: detection.handleChannelDetected,
    onPlaylistDetected: detection.handlePlaylistDetected,
    clearExternalUrl: detection.clearExternalUrl,
    clearDetection: detection.handleClearDetectionMessage,
  })

  const handleProcessTranscript = async () => {
    if (!urlSubmission.rawSegments || urlSubmission.rawSegments.length === 0) {
      urlSubmission.setFetchError('No transcript segments available.')
      return
    }
    await transcriptProcessing.process(urlSubmission.rawSegments, processingOptions.options)
  }

  const handleReProcess = async () => {
    if (!urlSubmission.rawSegments) return
    await transcriptProcessing.process(urlSubmission.rawSegments, processingOptions.options)
  }

  const handleClearDetectionMessage = () => {
    detection.handleClearDetectionMessage()
    urlSubmission.setUrlType(null)
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
      let pipelineSegments: TranscriptSegment[] = urlSubmission.rawSegments || []
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
          urlSubmission.setRawSegments(pipelineSegments)
          urlSubmission.setVideoMetadata({
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
          pipelineProcessedResult = processed
          updateStep(2, { status: 'completed' })
        }

        // Step 3: Set metadata (synchronous)
        if (startFrom <= 3) {
          updateStep(3, { status: 'in_progress' })
          setCurrentPipelineStep(3)
          updateStep(3, { status: 'completed' })
        }

        // Step 4: Generate AI summary
        if (startFrom <= 4) {
          updateStep(4, { status: 'in_progress' })
          setCurrentPipelineStep(4)

          const config = await fetchProviderConfig()
          const configuredKeys = (Object.keys(config) as Array<keyof typeof config>).filter(k => config[k])
          if (configuredKeys.length === 0) {
            updateStep(4, {
              status: 'failed',
              error: 'No AI providers configured. Add an API key in your .env.local file.',
            })
            return
          }

          const processedData = pipelineProcessedResult || transcriptProcessing.result
          const transcriptText =
            processedData?.segments.map((s) => s.text).join('\n') || ''

          if (!transcriptText) {
            updateStep(4, { status: 'failed', error: 'No transcript text available for summary.' })
            return
          }

          const providerArg = configuredKeys.length === 3 ? 'all' as const : configuredKeys[0]
          let allResults: AISummaryResponse[] = []

          if (configuredKeys.length === 1 || configuredKeys.length === 3) {
            allResults = await generateAISummary(transcriptText, providerArg, 'bullets', episode.url)
          } else {
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
          urlSubmission.setUrlType('video')
          urlSubmission.setCurrentUrl(episode.url)
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
    [updateStep, urlSubmission, transcriptProcessing, processingOptions.options, currentPipelineStep]
  )

  const handleSummarize = useCallback(
    (episode: FavoriteChannelEpisode) => {
      prePipelineStateRef.current = {
        videoMetadata: urlSubmission.videoMetadata,
        rawSegments: urlSubmission.rawSegments,
        urlType: urlSubmission.urlType,
        currentUrl: urlSubmission.currentUrl,
      }
      pipelineEpisodeRef.current = episode
      failCountRef.current = 0
      setPipelineSteps(PIPELINE_STEPS.map((s) => ({ ...s, status: 'pending' as const, error: undefined })))
      setPipelineOpen(true)
      runPipeline(episode, 1)
    },
    [runPipeline, urlSubmission.videoMetadata, urlSubmission.rawSegments, urlSubmission.urlType, urlSubmission.currentUrl]
  )

  const handlePipelineRetry = useCallback(() => {
    failCountRef.current++
    const failedStep = pipelineSteps.find((s) => s.status === 'failed')
    if (failedStep && pipelineEpisodeRef.current) {
      setPipelineSteps((prev) =>
        prev.map((s) =>
          s.id >= failedStep.id ? { ...s, status: 'pending' as const, error: undefined } : s
        )
      )
      runPipeline(pipelineEpisodeRef.current, failedStep.id)
    }
  }, [pipelineSteps, runPipeline])

  const handlePipelineClose = useCallback(() => {
    const hasFailed = pipelineSteps.some((s) => s.status === 'failed')
    if (hasFailed && prePipelineStateRef.current) {
      const prev = prePipelineStateRef.current
      urlSubmission.setVideoMetadata(prev.videoMetadata)
      urlSubmission.setRawSegments(prev.rawSegments)
      urlSubmission.setUrlType(prev.urlType)
      urlSubmission.setCurrentUrl(prev.currentUrl)
      setActiveTabOverride(null)
      setPipelineSummaries(null)
      transcriptProcessing.reset()
    }
    prePipelineStateRef.current = null
    setPipelineOpen(false)
    failCountRef.current = 0
    pipelineEpisodeRef.current = null
  }, [pipelineSteps, transcriptProcessing, urlSubmission])

  return (
    <Container className="py-12">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="flex flex-col gap-6">
            <ProcessingOptions
              onSubmit={urlSubmission.handleUrlSubmit}
              detectionMessage={detection.detectionMessage}
              onCopyUrl={detection.handleCopyUrl}
              externalUrl={detection.externalUrl}
              onExternalUrlCleared={detection.clearExternalUrl}
              onClearDetectionMessage={handleClearDetectionMessage}
              onSummarize={handleSummarize}
            />
          </div>

          {/* Right Column - Outputs */}
          <div className="flex flex-col gap-6">
            {(urlSubmission.urlType === 'video' || detection.detectedChannelUrl || detection.detectedPlaylistUrl) ? (
              <>
                <VideoPreview
                  metadata={urlSubmission.videoMetadata}
                  isLoading={urlSubmission.isFetchingTranscript || detection.isFetchingChannelInfo || detection.isFetchingPlaylistInfo}
                  error={urlSubmission.fetchError}
                  errorSuggestion={urlSubmission.errorSuggestion}
                  onProcess={urlSubmission.rawSegments ? handleProcessTranscript : undefined}
                  transcript={transcriptProcessing.result}
                  onReProcess={transcriptProcessing.result ? handleReProcess : undefined}
                  onPasteUrl={detection.handleCopyUrl}
                  channelUrl={detection.detectedChannelUrl}
                  playlistUrl={detection.detectedPlaylistUrl}
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

                {urlSubmission.isFetchingTranscript && (
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
                {urlSubmission.rawSegments && (
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
