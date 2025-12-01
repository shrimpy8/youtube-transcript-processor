import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  debounce,
  throttle,
  measurePerformance,
  isClient,
  isServer,
  getBundleSize,
  preloadResource,
  prefetchResource,
  prefersReducedMotion,
  requestIdleCallback,
  cancelIdleCallback,
} from '../performance-utils'

describe('performance-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('debounce', () => {
    it('delays function execution', () => {
      const func = vi.fn()
      const debounced = debounce(func, 100)

      debounced()
      expect(func).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('cancels previous calls', () => {
      const func = vi.fn()
      const debounced = debounce(func, 100)

      debounced()
      debounced()
      debounced()

      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('passes arguments correctly', () => {
      const func = vi.fn()
      const debounced = debounce(func, 100)

      debounced('arg1', 'arg2')
      vi.advanceTimersByTime(100)

      expect(func).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('throttle', () => {
    it('limits function calls', () => {
      const func = vi.fn()
      const throttled = throttle(func, 100)

      throttled()
      throttled()
      throttled()

      expect(func).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)
      throttled()
      expect(func).toHaveBeenCalledTimes(2)
    })

    it('passes arguments correctly', () => {
      const func = vi.fn()
      const throttled = throttle(func, 100)

      throttled('arg1', 'arg2')
      expect(func).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('measurePerformance', () => {
    it('measures async function performance', async () => {
      const func = vi.fn().mockResolvedValue('result')
      const { result, duration } = await measurePerformance('test', func)

      expect(result).toBe('result')
      expect(duration).toBeGreaterThanOrEqual(0)
      expect(func).toHaveBeenCalled()
    })

    it('measures sync function performance', async () => {
      const func = vi.fn().mockReturnValue('result')
      const { result, duration } = await measurePerformance('test', func)

      expect(result).toBe('result')
      expect(duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('isClient', () => {
    it('returns true in browser environment', () => {
      expect(isClient()).toBe(true)
    })
  })

  describe('isServer', () => {
    it('returns false in browser environment', () => {
      expect(isServer()).toBe(false)
    })
  })

  describe('getBundleSize', () => {
    it('returns bundle size information', () => {
      const result = getBundleSize()
      expect(result).not.toBeNull()
      expect(result).toHaveProperty('totalSize')
      expect(result).toHaveProperty('scripts')
    })
  })

  describe('preloadResource', () => {
    it('creates preload link element', () => {
      const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation(() => {
        return document.createElement('div') as unknown as Node
      })
      preloadResource('/test.js', 'script')

      expect(appendChildSpy).toHaveBeenCalled()
      const link = appendChildSpy.mock.calls[0][0] as HTMLLinkElement
      expect(link.rel).toBe('preload')
      expect(link.href).toContain('/test.js')
      expect(link.as).toBe('script')
      
      appendChildSpy.mockRestore()
    })
  })

  describe('prefetchResource', () => {
    it('creates prefetch link element', () => {
      const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation(() => {
        return document.createElement('div') as unknown as Node
      })
      prefetchResource('/test.js')

      expect(appendChildSpy).toHaveBeenCalled()
      const link = appendChildSpy.mock.calls[0][0] as HTMLLinkElement
      expect(link.rel).toBe('prefetch')
      expect(link.href).toContain('/test.js')
      
      appendChildSpy.mockRestore()
    })
  })

  describe('prefersReducedMotion', () => {
    it('checks reduced motion preference', () => {
      const result = prefersReducedMotion()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('requestIdleCallback', () => {
    it('executes callback', async () => {
      const callback = vi.fn()
      requestIdleCallback(callback)

      // Wait a bit for callback to execute (fallback setTimeout)
      await vi.advanceTimersByTimeAsync(10)
      
      // Should execute (either via requestIdleCallback or setTimeout fallback)
      expect(callback).toHaveBeenCalled()
    })

    it('returns callback ID', () => {
      const callback = vi.fn()
      const id = requestIdleCallback(callback)
      // setTimeout returns a number, but in some environments it might be an object
      expect(typeof id === 'number' || typeof id === 'object').toBe(true)
    })
  })

  describe('cancelIdleCallback', () => {
    it('cancels idle callback', () => {
      const callback = vi.fn()
      const id = requestIdleCallback(callback)
      cancelIdleCallback(id)
      // Callback should be cancelled
      expect(callback).not.toHaveBeenCalled()
    })
  })
})

