'use client'

import { useState, useCallback } from 'react'
import { processTranscript } from '@/lib/transcript-processor'
import { TranscriptSegment, ProcessedTranscript, ProcessingOptions } from '@/types'
import { extractErrorMessage } from '@/lib/utils'

type ProcessingState = 'idle' | 'processing' | 'completed' | 'error'

interface UseTranscriptProcessingReturn {
  process: (segments: TranscriptSegment[], options: ProcessingOptions) => Promise<ProcessedTranscript | null>
  state: ProcessingState
  result: ProcessedTranscript | null
  error: string | null
  progress: number
  cancel: () => void
  reset: () => void
}

/**
 * Hook for processing transcripts with progress tracking
 */
export function useTranscriptProcessing(): UseTranscriptProcessingReturn {
  const [state, setState] = useState<ProcessingState>('idle')
  const [result, setResult] = useState<ProcessedTranscript | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [cancelToken, setCancelToken] = useState<{ cancelled: boolean } | null>(null)

  const process = useCallback(async (
    segments: TranscriptSegment[],
    options: ProcessingOptions
  ): Promise<ProcessedTranscript | null> => {
    if (!segments || segments.length === 0) {
      setError('No segments to process')
      setState('error')
      return null
    }

    setState('processing')
    setError(null)
    setProgress(0)
    setResult(null)

    const token = { cancelled: false }
    setCancelToken(token)

    try {
      // Simulate progress updates
      setProgress(10)
      await new Promise(resolve => setTimeout(resolve, 50))

      if (token.cancelled) {
        setState('idle')
        return null
      }

      setProgress(30)
      await new Promise(resolve => setTimeout(resolve, 50))

      if (token.cancelled) {
        setState('idle')
        return null
      }

      setProgress(60)
      
      // Process transcript
      const processed = processTranscript(segments, options)

      if (token.cancelled) {
        setState('idle')
        return null
      }

      setProgress(100)
      setResult(processed)
      setState('completed')
      setCancelToken(null)

      return processed
    } catch (err) {
      if (token.cancelled) {
        setState('idle')
        return null
      }

      const errorMessage = extractErrorMessage(err, 'Processing failed')
      setError(errorMessage)
      setState('error')
      setCancelToken(null)
      return null
    }
  }, [])

  const cancel = useCallback(() => {
    if (cancelToken) {
      cancelToken.cancelled = true
      setCancelToken(null)
      setState('idle')
      setProgress(0)
    }
  }, [cancelToken])

  const reset = useCallback(() => {
    setState('idle')
    setResult(null)
    setError(null)
    setProgress(0)
    setCancelToken(null)
  }, [])

  return {
    process,
    state,
    result,
    error,
    progress,
    cancel,
    reset,
  }
}





