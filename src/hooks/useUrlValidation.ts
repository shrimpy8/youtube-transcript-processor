'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { validateAndParseUrl, ValidationResult } from '@/lib/youtube-validator'

/**
 * Hook for URL validation with debouncing
 */
export function useUrlValidation(debounceMs: number = 300) {
  const [url, setUrl] = useState('')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!url.trim()) {
      setValidationResult(null)
      setIsValidating(false)
      return
    }

    setIsValidating(true)
    
    // Set up debounced validation
    timeoutRef.current = setTimeout(() => {
      setIsValidating(false)
      const result = validateAndParseUrl(url.trim())
      setValidationResult(result)
    }, debounceMs)

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [url, debounceMs])

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setUrl('')
    setValidationResult(null)
    setIsValidating(false)
  }, [])

  return {
    url,
    setUrl,
    validationResult,
    isValidating,
    isValid: validationResult?.isValid ?? false,
    reset,
  }
}

