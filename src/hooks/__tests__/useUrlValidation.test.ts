import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUrlValidation } from '../useUrlValidation'

describe('useUrlValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useUrlValidation())
    
    expect(result.current.url).toBe('')
    expect(result.current.validationResult).toBe(null)
    expect(result.current.isValidating).toBe(false)
    expect(result.current.isValid).toBe(false)
  })

  it('updates URL when setUrl is called', () => {
    const { result } = renderHook(() => useUrlValidation())
    
    act(() => {
      result.current.setUrl('https://youtube.com/watch?v=abc')
    })
    
    expect(result.current.url).toBe('https://youtube.com/watch?v=abc')
  })

  it('validates URL after debounce delay', () => {
    const { result } = renderHook(() => useUrlValidation(300))
    
    act(() => {
      result.current.setUrl('https://youtube.com/watch?v=abc')
    })
    
    expect(result.current.isValidating).toBe(true)
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isValidating).toBe(false)
    expect(result.current.validationResult).not.toBe(null)
    expect(result.current.isValid).toBe(true)
  })

  it('resets state when reset is called', () => {
    const { result } = renderHook(() => useUrlValidation())
    
    act(() => {
      result.current.setUrl('https://youtube.com/watch?v=abc')
    })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(result.current.isValid).toBe(true)
    
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.url).toBe('')
    expect(result.current.validationResult).toBe(null)
    expect(result.current.isValidating).toBe(false)
  })

  it('does not validate empty URL', () => {
    const { result } = renderHook(() => useUrlValidation())
    
    act(() => {
      result.current.setUrl('')
    })
    
    expect(result.current.validationResult).toBe(null)
    expect(result.current.isValidating).toBe(false)
  })
})

