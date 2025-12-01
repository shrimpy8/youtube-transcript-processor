'use client'

import { useState, useCallback, useRef } from 'react'

export interface UseErrorRecoveryOptions {
  maxRetries?: number
  initialRetryDelay?: number
  maxRetryDelay?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number) => void
  onMaxRetriesReached?: () => void
}

export interface UseErrorRecoveryResult {
  error: Error | null
  retryCount: number
  isRetrying: boolean
  canRetry: boolean
  retry: () => Promise<void>
  reset: () => void
  setError: (error: Error | null) => void
}

/**
 * Hook for error recovery with exponential backoff retry logic
 */
export function useErrorRecovery(
  retryFn: () => Promise<void>,
  options: UseErrorRecoveryOptions = {}
): UseErrorRecoveryResult {
  const {
    maxRetries = 3,
    initialRetryDelay = 1000,
    maxRetryDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    onMaxRetriesReached,
  } = options

  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const calculateDelay = useCallback(
    (attempt: number): number => {
      const delay = initialRetryDelay * Math.pow(backoffMultiplier, attempt)
      return Math.min(delay, maxRetryDelay)
    },
    [initialRetryDelay, backoffMultiplier, maxRetryDelay]
  )

  const retry = useCallback(async () => {
    if (isRetrying || retryCount >= maxRetries) {
      return
    }

    setIsRetrying(true)
    const attempt = retryCount + 1

    try {
      // Call optional callback
      if (onRetry) {
        onRetry(attempt)
      }

      // Calculate delay for exponential backoff
      const delay = calculateDelay(retryCount)

      // Wait before retrying (except for first retry)
      if (retryCount > 0) {
        await new Promise((resolve) => {
          timeoutRef.current = setTimeout(resolve, delay)
        })
      }

      // Attempt the retry
      await retryFn()

      // Success - reset error state
      setError(null)
      setRetryCount(0)
    } catch (err) {
      const newError = err instanceof Error ? err : new Error(String(err))
      setError(newError)
      setRetryCount(attempt)

      // Check if we've reached max retries
      if (attempt >= maxRetries) {
        if (onMaxRetriesReached) {
          onMaxRetriesReached()
        }
      }
    } finally {
      setIsRetrying(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [
    isRetrying,
    retryCount,
    maxRetries,
    retryFn,
    calculateDelay,
    onRetry,
    onMaxRetriesReached,
  ])

  const reset = useCallback(() => {
    setError(null)
    setRetryCount(0)
    setIsRetrying(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const handleSetError = useCallback((newError: Error | null) => {
    setError(newError)
    if (!newError) {
      setRetryCount(0)
    }
  }, [])

  return {
    error,
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries,
    retry,
    reset,
    setError: handleSetError,
  }
}

