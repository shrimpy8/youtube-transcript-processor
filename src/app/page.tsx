'use client'

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
import { useSummarizePipeline } from "@/hooks/useSummarizePipeline"

export default function Home() {
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

  const pipeline = useSummarizePipeline({
    rawSegments: urlSubmission.rawSegments,
    videoMetadata: urlSubmission.videoMetadata,
    currentUrl: urlSubmission.currentUrl,
    urlType: urlSubmission.urlType,
    processingOptions: processingOptions.options,
    setVideoMetadata: urlSubmission.setVideoMetadata,
    setRawSegments: urlSubmission.setRawSegments,
    setCurrentUrl: urlSubmission.setCurrentUrl,
    setUrlType: urlSubmission.setUrlType,
    transcriptProcess: transcriptProcessing.process,
    transcriptReset: transcriptProcessing.reset,
    transcriptResult: transcriptProcessing.result,
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

  return (
    <Container className="py-8" maxWidth="full">
      <div className="flex flex-col gap-8 max-w-7xl ml-auto mr-auto xl:ml-[10%] xl:mr-auto">
        {/* Intro — left-aligned to match Processing Options panel */}
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Extract transcripts from any YouTube video, browse your favorite podcast channels,<br />
            and generate AI-powered summaries with one click.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 font-medium">1. Paste a URL</span>
            <span>→</span>
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 font-medium">2. Extract Transcript</span>
            <span>→</span>
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 font-medium">3. Get AI Summary</span>
            <span className="mx-1">|</span>
            <a
              href="/how-it-works.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              How It Works →
            </a>
          </div>
        </div>

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
              onSummarize={pipeline.handleSummarize}
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
                  activeTabOverride={pipeline.activeTabOverride}
                  preGeneratedSummaries={pipeline.pipelineSummaries}
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
        isOpen={pipeline.isOpen}
        steps={pipeline.steps}
        currentStep={pipeline.currentStep}
        onRetry={pipeline.handlePipelineRetry}
        onClose={pipeline.handlePipelineClose}
        isSecondFailure={pipeline.isSecondFailure}
      />
    </Container>
  )
}
