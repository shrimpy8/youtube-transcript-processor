'use client'

import { useCallback, useReducer, useRef } from 'react'
import { fetchTranscriptByUrlWithYtDlp, generateAISummary, fetchProviderConfig } from '@/lib/api-client'
import { VideoMetadata } from '@/components/features/VideoPreview'
import {
  TranscriptSegment,
  ProcessedTranscript,
  FavoriteChannelEpisode,
  PipelineStep,
  PipelineStepId,
  AISummaryResponse,
  ProcessingOptions,
} from '@/types'
import { PIPELINE_STEP_LABELS, getYouTubeThumbnailUrl } from '@/lib/constants'

// ---- Constants ----

const INITIAL_STEPS: PipelineStep[] = PIPELINE_STEP_LABELS.map((label, i) => ({
  id: (i + 1) as PipelineStepId,
  label,
  status: 'pending' as const,
}))

// ---- Reducer ----

interface PipelineState {
  isOpen: boolean
  steps: PipelineStep[]
  currentStep: PipelineStepId | null
  summaries: AISummaryResponse[] | null
  activeTabOverride: string | null
}

type PipelineAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'UPDATE_STEP'; stepId: PipelineStepId; update: Partial<PipelineStep> }
  | { type: 'SET_CURRENT_STEP'; stepId: PipelineStepId | null }
  | { type: 'SET_SUMMARIES'; summaries: AISummaryResponse[] }
  | { type: 'SET_TAB_OVERRIDE'; tab: string | null }
  | { type: 'RESET_FROM'; stepId: PipelineStepId }
  | { type: 'RESET_ALL' }

const initialState: PipelineState = {
  isOpen: false,
  steps: INITIAL_STEPS,
  currentStep: null,
  summaries: null,
  activeTabOverride: null,
}

function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case 'OPEN':
      return {
        ...state,
        isOpen: true,
        steps: INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' as const, error: undefined })),
        currentStep: null,
        summaries: null,
        activeTabOverride: null,
      }
    case 'CLOSE':
      return { ...state, isOpen: false, currentStep: null }
    case 'UPDATE_STEP':
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.id === action.stepId ? { ...s, ...action.update } : s
        ),
      }
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.stepId }
    case 'SET_SUMMARIES':
      return { ...state, summaries: action.summaries }
    case 'SET_TAB_OVERRIDE':
      return { ...state, activeTabOverride: action.tab }
    case 'RESET_FROM':
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.id >= action.stepId ? { ...s, status: 'pending' as const, error: undefined } : s
        ),
      }
    case 'RESET_ALL':
      return initialState
    default:
      return state
  }
}

// ---- Hook interface ----

export interface UseSummarizePipelineReturn {
  isOpen: boolean
  steps: PipelineStep[]
  currentStep: PipelineStepId | null
  isSecondFailure: boolean
  pipelineSummaries: AISummaryResponse[] | null
  activeTabOverride: string | null
  handleSummarize: (episode: FavoriteChannelEpisode) => void
  handlePipelineRetry: () => void
  handlePipelineClose: () => void
}

interface PipelineDeps {
  // Cross-hook reads
  rawSegments: TranscriptSegment[] | null
  videoMetadata: VideoMetadata | null
  currentUrl: string | null
  urlType: 'video' | 'playlist' | 'channel' | null
  processingOptions: ProcessingOptions

  // Cross-hook writes (from useUrlSubmission)
  setVideoMetadata: (m: VideoMetadata | null) => void
  setRawSegments: (s: TranscriptSegment[] | null) => void
  setCurrentUrl: (u: string | null) => void
  setUrlType: (t: 'video' | 'playlist' | 'channel' | null) => void

  // Transcript processing
  transcriptProcess: (segments: TranscriptSegment[], options: ProcessingOptions) => Promise<ProcessedTranscript | null>
  transcriptReset: () => void
  transcriptResult: ProcessedTranscript | null
}

// ---- Step functions ----

async function executeStep1_FetchTranscript(
  episode: FavoriteChannelEpisode,
  deps: PipelineDeps,
  dispatch: React.Dispatch<PipelineAction>,
): Promise<TranscriptSegment[] | null> {
  dispatch({ type: 'UPDATE_STEP', stepId: 1, update: { status: 'in_progress' } })
  dispatch({ type: 'SET_CURRENT_STEP', stepId: 1 })

  const response = await fetchTranscriptByUrlWithYtDlp(episode.url)
  if (!response.success || !response.data || !response.data.segments?.length) {
    const errMsg = response.error || "This video doesn't have captions available."
    dispatch({ type: 'UPDATE_STEP', stepId: 1, update: { status: 'failed', error: errMsg } })
    return null
  }

  const segments = response.data.segments
  deps.setRawSegments(segments)
  deps.setVideoMetadata({
    id: response.data.videoId,
    title: response.data.title || episode.title,
    url: episode.url,
    thumbnail: response.data.thumbnail || getYouTubeThumbnailUrl(response.data.videoId),
    channelTitle: response.data.channelTitle,
    publishedAt: response.data.publishedAt,
    duration: response.data.duration,
  })
  dispatch({ type: 'UPDATE_STEP', stepId: 1, update: { status: 'completed' } })
  return segments
}

async function executeStep2_ProcessTranscript(
  segments: TranscriptSegment[],
  deps: PipelineDeps,
  dispatch: React.Dispatch<PipelineAction>,
): Promise<ProcessedTranscript | null> {
  dispatch({ type: 'UPDATE_STEP', stepId: 2, update: { status: 'in_progress' } })
  dispatch({ type: 'SET_CURRENT_STEP', stepId: 2 })

  if (segments.length === 0) {
    dispatch({ type: 'UPDATE_STEP', stepId: 2, update: { status: 'failed', error: 'No transcript segments to process.' } })
    return null
  }

  const processed = await deps.transcriptProcess(segments, deps.processingOptions)
  if (!processed) {
    dispatch({ type: 'UPDATE_STEP', stepId: 2, update: { status: 'failed', error: 'Transcript processing failed.' } })
    return null
  }
  dispatch({ type: 'UPDATE_STEP', stepId: 2, update: { status: 'completed' } })
  return processed
}

function executeStep3_SetMetadata(
  dispatch: React.Dispatch<PipelineAction>,
): void {
  dispatch({ type: 'UPDATE_STEP', stepId: 3, update: { status: 'in_progress' } })
  dispatch({ type: 'SET_CURRENT_STEP', stepId: 3 })
  dispatch({ type: 'UPDATE_STEP', stepId: 3, update: { status: 'completed' } })
}

async function executeStep4_GenerateSummary(
  processedResult: ProcessedTranscript | null,
  episode: FavoriteChannelEpisode,
  deps: PipelineDeps,
  dispatch: React.Dispatch<PipelineAction>,
): Promise<AISummaryResponse[] | null> {
  dispatch({ type: 'UPDATE_STEP', stepId: 4, update: { status: 'in_progress' } })
  dispatch({ type: 'SET_CURRENT_STEP', stepId: 4 })

  const config = await fetchProviderConfig()
  const configuredKeys = (Object.keys(config) as Array<keyof typeof config>).filter(k => config[k])
  if (configuredKeys.length === 0) {
    dispatch({
      type: 'UPDATE_STEP',
      stepId: 4,
      update: { status: 'failed', error: 'No AI providers configured. Add an API key in your .env.local file.' },
    })
    return null
  }

  const processedData = processedResult || deps.transcriptResult
  const transcriptText = processedData?.segments.map((s) => s.text).join('\n') || ''

  if (!transcriptText) {
    dispatch({
      type: 'UPDATE_STEP',
      stepId: 4,
      update: { status: 'failed', error: 'No transcript text available for summary.' },
    })
    return null
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

  dispatch({ type: 'SET_SUMMARIES', summaries: allResults })
  dispatch({ type: 'UPDATE_STEP', stepId: 4, update: { status: 'completed' } })
  return allResults
}

function executeStep5_Navigate(
  episode: FavoriteChannelEpisode,
  deps: PipelineDeps,
  dispatch: React.Dispatch<PipelineAction>,
): void {
  dispatch({ type: 'UPDATE_STEP', stepId: 5, update: { status: 'in_progress' } })
  dispatch({ type: 'SET_CURRENT_STEP', stepId: 5 })
  deps.setUrlType('video')
  deps.setCurrentUrl(episode.url)
  dispatch({ type: 'SET_TAB_OVERRIDE', tab: 'ai-summary' })
  dispatch({ type: 'UPDATE_STEP', stepId: 5, update: { status: 'completed' } })
}

// ---- Hook ----

export function useSummarizePipeline(deps: PipelineDeps): UseSummarizePipelineReturn {
  const [state, dispatch] = useReducer(pipelineReducer, initialState)

  const failCountRef = useRef(0)
  const pipelineEpisodeRef = useRef<FavoriteChannelEpisode | null>(null)
  const prePipelineStateRef = useRef<{
    videoMetadata: VideoMetadata | null
    rawSegments: TranscriptSegment[] | null
    urlType: 'video' | 'playlist' | 'channel' | null
    currentUrl: string | null
  } | null>(null)

  const runPipeline = useCallback(
    async (episode: FavoriteChannelEpisode, startFrom: PipelineStepId = 1) => {
      dispatch({ type: 'SET_CURRENT_STEP', stepId: startFrom })
      let pipelineSegments: TranscriptSegment[] = deps.rawSegments || []
      let pipelineProcessedResult: ProcessedTranscript | null = null

      try {
        if (startFrom <= 1) {
          const segments = await executeStep1_FetchTranscript(episode, deps, dispatch)
          if (!segments) return
          pipelineSegments = segments
        }

        if (startFrom <= 2) {
          const processed = await executeStep2_ProcessTranscript(pipelineSegments, deps, dispatch)
          if (!processed) return
          pipelineProcessedResult = processed
        }

        if (startFrom <= 3) {
          executeStep3_SetMetadata(dispatch)
        }

        if (startFrom <= 4) {
          const summaries = await executeStep4_GenerateSummary(pipelineProcessedResult, episode, deps, dispatch)
          if (!summaries) return
        }

        if (startFrom <= 5) {
          executeStep5_Navigate(episode, deps, dispatch)
        }

        // All done — auto-dismiss after 500ms
        dispatch({ type: 'SET_CURRENT_STEP', stepId: null })
        setTimeout(() => {
          dispatch({ type: 'CLOSE' })
          failCountRef.current = 0
        }, 500)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred'
        const currentStepVal = startFrom
        if (failCountRef.current >= 1) {
          dispatch({
            type: 'UPDATE_STEP',
            stepId: currentStepVal,
            update: { status: 'failed', error: 'Something went wrong. Please try again later.' },
          })
        } else {
          dispatch({
            type: 'UPDATE_STEP',
            stepId: currentStepVal,
            update: { status: 'failed', error: msg },
          })
        }
      }
    },
    [deps]
  )

  const handleSummarize = useCallback(
    (episode: FavoriteChannelEpisode) => {
      prePipelineStateRef.current = {
        videoMetadata: deps.videoMetadata,
        rawSegments: deps.rawSegments,
        urlType: deps.urlType,
        currentUrl: deps.currentUrl,
      }
      pipelineEpisodeRef.current = episode
      failCountRef.current = 0
      dispatch({ type: 'OPEN' })
      runPipeline(episode, 1)
    },
    [runPipeline, deps.videoMetadata, deps.rawSegments, deps.urlType, deps.currentUrl]
  )

  const handlePipelineRetry = useCallback(() => {
    failCountRef.current++
    const failedStep = state.steps.find((s) => s.status === 'failed')
    if (failedStep && pipelineEpisodeRef.current) {
      dispatch({ type: 'RESET_FROM', stepId: failedStep.id })
      runPipeline(pipelineEpisodeRef.current, failedStep.id)
    }
  }, [state.steps, runPipeline])

  const handlePipelineClose = useCallback(() => {
    const hasFailed = state.steps.some((s) => s.status === 'failed')
    if (hasFailed && prePipelineStateRef.current) {
      const prev = prePipelineStateRef.current
      deps.setVideoMetadata(prev.videoMetadata)
      deps.setRawSegments(prev.rawSegments)
      deps.setUrlType(prev.urlType)
      deps.setCurrentUrl(prev.currentUrl)
      deps.transcriptReset()
    }
    prePipelineStateRef.current = null
    dispatch({ type: 'RESET_ALL' })
    failCountRef.current = 0
    pipelineEpisodeRef.current = null
  }, [state.steps, deps])

  return {
    isOpen: state.isOpen,
    steps: state.steps,
    currentStep: state.currentStep,
    isSecondFailure: failCountRef.current >= 1,
    pipelineSummaries: state.summaries,
    activeTabOverride: state.activeTabOverride,
    handleSummarize,
    handlePipelineRetry,
    handlePipelineClose,
  }
}
