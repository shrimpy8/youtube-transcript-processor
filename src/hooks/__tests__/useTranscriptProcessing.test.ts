import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTranscriptProcessing } from '../useTranscriptProcessing'

describe('useTranscriptProcessing', () => {
  it('initializes with idle state', () => {
    const { result } = renderHook(() => useTranscriptProcessing())
    
    expect(result.current.state).toBe('idle')
    expect(result.current.result).toBe(null)
    expect(result.current.error).toBe(null)
    expect(result.current.progress).toBe(0)
  })

  it('has process function', () => {
    const { result } = renderHook(() => useTranscriptProcessing())
    
    expect(typeof result.current.process).toBe('function')
  })

  it('has cancel function', () => {
    const { result } = renderHook(() => useTranscriptProcessing())
    
    expect(typeof result.current.cancel).toBe('function')
  })

  it('has reset function', () => {
    const { result } = renderHook(() => useTranscriptProcessing())
    
    expect(typeof result.current.reset).toBe('function')
  })

  it('can reset state', () => {
    const { result } = renderHook(() => useTranscriptProcessing())
    
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.state).toBe('idle')
    expect(result.current.result).toBe(null)
    expect(result.current.error).toBe(null)
    expect(result.current.progress).toBe(0)
  })

  // Note: Full processing tests are done in integration/E2E tests
  // due to complexity of async state updates with timers
})
