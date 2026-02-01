import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useErrorRecovery } from '../useErrorRecovery'

describe('useErrorRecovery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with no error', () => {
    const retryFn = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useErrorRecovery(retryFn))

    expect(result.current.error).toBeNull()
    expect(result.current.retryCount).toBe(0)
    expect(result.current.isRetrying).toBe(false)
    expect(result.current.canRetry).toBe(true)
  })

  it('calls retry function on retry', async () => {
    const retryFn = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useErrorRecovery(retryFn))

    await act(async () => {
      await result.current.retry()
    })

    expect(retryFn).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeNull()
    expect(result.current.retryCount).toBe(0)
  })

  it('handles successful retry', async () => {
    const retryFn = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useErrorRecovery(retryFn))

    await act(async () => {
      await result.current.retry()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.retryCount).toBe(0)
    expect(result.current.isRetrying).toBe(false)
  })

  it('handles failed retry and increments retry count', async () => {
    const error = new Error('Retry failed')
    const retryFn = vi.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useErrorRecovery(retryFn))

    await act(async () => {
      await result.current.retry()
    })

    expect(result.current.error).toEqual(error)
    expect(result.current.retryCount).toBe(1)
    expect(result.current.canRetry).toBe(true)
  })

  it('stops retrying after max retries', async () => {
    const error = new Error('Retry failed')
    const retryFn = vi.fn().mockRejectedValue(error)
    const { result } = renderHook(() =>
      useErrorRecovery(retryFn, { maxRetries: 2 })
    )

    // First retry
    await act(async () => {
      await result.current.retry()
    })
    expect(result.current.retryCount).toBe(1)
    expect(result.current.canRetry).toBe(true)

    // Second retry
    await act(async () => {
      await result.current.retry()
    })
    expect(result.current.retryCount).toBe(2)
    expect(result.current.canRetry).toBe(false)

    // Third retry should not execute
    await act(async () => {
      await result.current.retry()
    })
    expect(result.current.retryCount).toBe(2)
    expect(retryFn).toHaveBeenCalledTimes(2)
  })

  it('calls onRetry callback', async () => {
    const retryFn = vi.fn().mockResolvedValue(undefined)
    const onRetry = vi.fn()
    const { result } = renderHook(() =>
      useErrorRecovery(retryFn, { onRetry })
    )

    await act(async () => {
      await result.current.retry()
    })

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1)
  })

  it('calls onMaxRetriesReached when max retries reached', async () => {
    const error = new Error('Retry failed')
    const retryFn = vi.fn().mockRejectedValue(error)
    const onMaxRetriesReached = vi.fn()
    const { result } = renderHook(() =>
      useErrorRecovery(retryFn, {
        maxRetries: 1,
        onMaxRetriesReached,
      })
    )

    await act(async () => {
      await result.current.retry()
    })

    expect(onMaxRetriesReached).toHaveBeenCalledTimes(1)
  })

  it('implements exponential backoff', async () => {
    vi.useFakeTimers()
    try {
      const error = new Error('Retry failed')
      const retryFn = vi.fn().mockRejectedValue(error)
      const { result, unmount } = renderHook(() =>
        useErrorRecovery(retryFn, {
          initialRetryDelay: 1000,
          backoffMultiplier: 2,
        })
      )

      // First retry - no delay (retryCount is 0, so no delay)
      await act(async () => {
        const promise = result.current.retry()
        await promise
      })

      expect(retryFn).toHaveBeenCalledTimes(1)

      // Second retry - should wait 1000ms (retryCount is 1, delay = 1000 * 2^1 = 2000)
      await act(async () => {
        const promise = result.current.retry()
        // Advance timers to trigger the delay
        await vi.runAllTimersAsync()
        await promise
      })

      expect(retryFn).toHaveBeenCalledTimes(2)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  }, 10000)

  it('respects maxRetryDelay', async () => {
    vi.useFakeTimers()
    try {
      const error = new Error('Retry failed')
      const retryFn = vi.fn().mockRejectedValue(error)
      const { result, unmount } = renderHook(() =>
        useErrorRecovery(retryFn, {
          initialRetryDelay: 1000,
          maxRetryDelay: 2000,
          backoffMultiplier: 10,
        })
      )

      // First retry - no delay
      await act(async () => {
        const promise = result.current.retry()
        await promise
      })

      expect(retryFn).toHaveBeenCalledTimes(1)

      // Second retry - delay should be capped at 2000ms (1000 * 10^1 = 10000, capped at 2000)
      await act(async () => {
        const promise = result.current.retry()
        await vi.runAllTimersAsync()
        await promise
      })

      expect(retryFn).toHaveBeenCalledTimes(2)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  }, 10000)

  it('sets isRetrying during retry', async () => {
    let resolveRetry: () => void
    const retryFn = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve
        })
    )
    const { result, unmount } = renderHook(() => useErrorRecovery(retryFn))

    // Start retry (don't await yet)
    const retryPromise = result.current.retry()

    // Check isRetrying is true immediately
    await waitFor(() => {
      expect(result.current.isRetrying).toBe(true)
    })

    // Resolve the promise
    resolveRetry!()
    await act(async () => {
      await retryPromise
    })

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.isRetrying).toBe(false)
    })
    
    unmount()
  })

  it('prevents concurrent retries', async () => {
    // Use a delayed retry function to ensure state updates happen
    let resolveRetry: () => void
    const retryFn = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve
        })
    )
    const { result, unmount } = renderHook(() => useErrorRecovery(retryFn))

    // Start first retry (don't await)
    const promise1 = result.current.retry()
    
    // Wait for isRetrying to become true
    await waitFor(() => {
      expect(result.current.isRetrying).toBe(true)
    })
    
    // Try to start second retry (should be prevented because isRetrying is now true)
    const promise2 = result.current.retry()
    
    // Resolve the first retry
    resolveRetry!()
    
    await act(async () => {
      await Promise.all([promise1, promise2])
    })

    // Should only call retryFn once (second call should be prevented)
    expect(retryFn).toHaveBeenCalledTimes(1)
    
    unmount()
  })

  it('resets error state', () => {
    const retryFn = vi.fn().mockResolvedValue(undefined)
    const { result, unmount } = renderHook(() => useErrorRecovery(retryFn))

    act(() => {
      result.current.setError(new Error('Test error'))
    })

    expect(result.current.error).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.retryCount).toBe(0)
    expect(result.current.isRetrying).toBe(false)
    
    unmount()
  })

  it('sets error manually', () => {
    const retryFn = vi.fn().mockResolvedValue(undefined)
    const { result, unmount } = renderHook(() => useErrorRecovery(retryFn))

    const error = new Error('Manual error')
    act(() => {
      result.current.setError(error)
    })

    expect(result.current.error).toEqual(error)
    
    unmount()
  })

  it('resets retry count when error is cleared', () => {
    const retryFn = vi.fn().mockResolvedValue(undefined)
    const { result, unmount } = renderHook(() => useErrorRecovery(retryFn))

    act(() => {
      result.current.setError(new Error('Test error'))
    })

    act(() => {
      result.current.setError(null)
    })

    expect(result.current.retryCount).toBe(0)
    
    unmount()
  })

  it('handles non-Error objects in retry failure', async () => {
    const retryFn = vi.fn().mockRejectedValue('String error')
    const { result, unmount } = renderHook(() => useErrorRecovery(retryFn))

    await act(async () => {
      await result.current.retry()
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('String error')
    
    unmount()
  })
})

