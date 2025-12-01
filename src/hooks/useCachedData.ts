'use client'

import { useState, useEffect, useCallback } from 'react'
import { extractErrorMessage } from '@/lib/utils'

/**
 * Generic hook for fetching and caching data
 * Provides loading state, error handling, and cache management
 * 
 * @template TData - Type of data being fetched
 * @template TCache - Type of cache being used (must have get, set, delete methods)
 * @param url - URL or key to fetch data for (null to clear)
 * @param cache - Cache instance with get, set, delete methods
 * @param fetchFn - Function to fetch data
 * @param defaultErrorMessage - Default error message if fetch fails
 * @returns Object with data, loading state, error, and refetch function
 */
export function useCachedData<TData, TCache extends {
  get: (key: string) => TData | null | undefined
  set: (key: string, value: TData) => void
  delete: (key: string) => void
}>(
  url: string | null,
  cache: TCache,
  fetchFn: (url: string) => Promise<{ success: boolean; data?: TData; error?: string }>,
  defaultErrorMessage: string = 'Failed to load data'
): {
  data: TData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const [data, setData] = useState<TData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!url) {
      setData(null)
      setError(null)
      return
    }

    // Check cache first
    const cachedData = cache.get(url)
    if (cachedData != null) {
      setData(cachedData)
      setError(null)
      setIsLoading(false)
      return
    }

    // Fetch from API
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchFn(url)

      if (response.success && response.data) {
        // Cache the response
        cache.set(url, response.data)
        setData(response.data)
      } else {
        const errorMessage = response.error || defaultErrorMessage
        setError(errorMessage)
        setData(null)
      }
    } catch (err) {
      const errorMessage = extractErrorMessage(err, defaultErrorMessage)
      setError(errorMessage)
      setData(null)
      console.error('Data fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [url, cache, fetchFn, defaultErrorMessage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(async () => {
    if (url) {
      // Clear cache for this URL to force fresh fetch
      cache.delete(url)
      await fetchData()
    }
  }, [url, cache, fetchData])

  return {
    data,
    isLoading,
    error,
    refetch,
  }
}

