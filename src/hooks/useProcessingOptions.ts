'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProcessingOptions } from '@/types'
import { DEFAULT_PROCESSING_OPTIONS, STORAGE_KEYS } from '@/lib/constants'

const STORAGE_KEY = STORAGE_KEYS.PROCESSING_OPTIONS

/**
 * Hook for managing processing options with localStorage persistence
 */
export function useProcessingOptions() {
  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_PROCESSING_OPTIONS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setOptions({ ...DEFAULT_PROCESSING_OPTIONS, ...parsed })
      }
    } catch (error) {
      console.error('Failed to load processing options:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save to localStorage when options change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
      } catch (error) {
        console.error('Failed to save processing options:', error)
      }
    }
  }, [options, isLoaded])

  const updateOption = useCallback(<K extends keyof ProcessingOptions>(
    key: K,
    value: ProcessingOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setOptions(DEFAULT_PROCESSING_OPTIONS)
  }, [])

  return {
    options,
    updateOption,
    resetToDefaults,
    isLoaded,
  }
}



