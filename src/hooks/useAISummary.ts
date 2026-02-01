'use client'

import { useState, useCallback, useEffect } from 'react'
import { LLMProvider, AISummaryResponse, AISummaryState, SummaryStyle } from '@/types'
import { generateAISummary, fetchProviderConfig } from '@/lib/api-client'
import { ALL_PROVIDERS, type LLMProviderKey } from '@/lib/llm-config'
import { extractErrorMessage } from '@/lib/utils'

/**
 * Hook that fetches which LLM providers have API keys configured.
 * Fail-open: if the fetch fails or is still loading, all providers are treated as configured.
 */
export function useProviderConfig() {
  const [providers, setProviders] = useState<Record<LLMProviderKey, boolean> | null>(null)
  const [isConfigLoading, setIsConfigLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchProviderConfig().then(result => {
      if (!cancelled) {
        setProviders(result)
        setIsConfigLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const isProviderConfigured = useCallback((provider: LLMProviderKey): boolean => {
    // Fail-open: if config hasn't loaded yet, assume configured
    if (!providers) return true
    return providers[provider] ?? true
  }, [providers])

  const configuredProviders = providers ?? { anthropic: true, 'google-gemini': true, perplexity: true }
  const noKeysConfigured = providers ? ALL_PROVIDERS.every(p => !providers[p]) : false
  const anyKeyConfigured = providers ? ALL_PROVIDERS.some(p => providers[p]) : true

  return {
    isProviderConfigured,
    configuredProviders,
    noKeysConfigured,
    anyKeyConfigured,
    isConfigLoading,
  }
}

/**
 * Hook for managing AI summary state, loading, and errors
 * 
 * Provides a centralized state management solution for AI summary generation,
 * handling loading states per provider, error states, and summary caching.
 * 
 * @returns Object containing:
 * - summaries: Array of successful summary responses
 * - loading: Record of loading states per provider
 * - errors: Record of error messages per provider
 * - hasGenerated: Boolean indicating if any summary has been generated
 * - isLoading: Boolean indicating if any provider is currently loading
 * - generateSummary: Function to trigger summary generation
 * - reset: Function to reset all state
 * - getSummaryForProvider: Function to get summary for specific provider
 * - hasError: Function to check if provider has error
 * - getError: Function to get error message for provider
 * - isProviderLoading: Function to check if provider is loading
 * 
 * @example
 * ```tsx
 * const { summaries, generateSummary, isLoading } = useAISummary()
 * 
 * await generateSummary(transcriptText, 'anthropic')
 * ```
 */
export function useAISummary() {
  const [state, setState] = useState<AISummaryState>({
    summaries: [],
    loading: {},
    errors: {},
    hasGenerated: false,
  })

  /**
   * Generates summary for the selected provider(s)
   * Handles loading states, error states, and result processing
   * 
   * @param transcript - The transcript text to summarize
   * @param provider - LLM provider to use ('anthropic', 'google-gemini', 'perplexity', or 'all')
   * @returns Promise that resolves when generation is complete
   * @remarks When provider is 'all', generates summaries for all providers in parallel
   */
  const generateSummary = useCallback(async (
    transcript: string,
    provider: LLMProvider,
    summaryStyle: SummaryStyle = 'bullets',
    videoUrl?: string,
    configuredProviders?: Record<LLMProviderKey, boolean>
  ): Promise<void> => {
    // Validate transcript input
    if (!transcript || transcript.trim().length === 0) {
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, general: 'Transcript is required' },
      }))
      return
    }

    // Determine which providers to load based on selection
    const allProviders: LLMProviderKey[] =
      provider === 'all'
        ? ALL_PROVIDERS
        : [provider]

    // Split into configured (will request) and unconfigured (skip)
    const providersToRequest = configuredProviders
      ? allProviders.filter(p => configuredProviders[p])
      : allProviders
    const unconfiguredProviders = configuredProviders
      ? allProviders.filter(p => !configuredProviders[p])
      : []

    // Initialize loading and error states for all providers
    setState(prev => {
      const newLoading: Record<string, boolean> = { ...prev.loading }
      const newErrors: Record<string, string | null> = { ...prev.errors }

      providersToRequest.forEach(p => {
        newLoading[p] = true
        newErrors[p] = null
      })
      // Immediately mark unconfigured providers as errors (no network call)
      unconfiguredProviders.forEach(p => {
        newLoading[p] = false
        newErrors[p] = 'API key not configured'
      })

      return {
        ...prev,
        loading: newLoading,
        errors: newErrors,
      }
    })

    // Nothing to request — all providers unconfigured
    if (providersToRequest.length === 0) {
      setState(prev => ({ ...prev, hasGenerated: true }))
      return
    }

    // Determine the provider value to send to the API
    // If "all" was selected but only some are configured, send individual requests
    const apiProvider: LLMProvider =
      provider === 'all' && providersToRequest.length === ALL_PROVIDERS.length
        ? 'all'
        : provider === 'all'
          ? providersToRequest[0] // will handle multiple below
          : provider

    try {
      let summaries: AISummaryResponse[]

      if (provider === 'all' && providersToRequest.length < ALL_PROVIDERS.length) {
        // Send individual requests only for configured providers in parallel
        const results = await Promise.all(
          providersToRequest.map(p => generateAISummary(transcript, p, summaryStyle, videoUrl))
        )
        summaries = results.flat()
      } else {
        summaries = await generateAISummary(transcript, apiProvider, summaryStyle, videoUrl)
      }

      // Process results and update state
      setState(prev => {
        const newLoading: Record<string, boolean> = { ...prev.loading }
        const newErrors: Record<string, string | null> = { ...prev.errors }
        const newSummaries: AISummaryResponse[] = []

        // Process each summary result
        summaries.forEach(summary => {
          const providerKey = summary.provider
          newLoading[providerKey] = false

          if (summary.success) {
            newSummaries.push(summary)
            newErrors[providerKey] = null
          } else {
            newErrors[providerKey] = summary.error || 'Failed to generate summary'
          }
        })

        return {
          summaries: newSummaries,
          loading: newLoading,
          errors: newErrors,
          hasGenerated: true,
        }
      })
    } catch (error) {
      // Handle general errors (e.g., network failures)
      const errorMessage = extractErrorMessage(error, 'Failed to generate summary')

      setState(prev => {
        const newLoading: Record<string, boolean> = { ...prev.loading }
        const newErrors: Record<string, string | null> = { ...prev.errors }

        // Mark requested providers as failed
        providersToRequest.forEach(p => {
          newLoading[p] = false
          newErrors[p] = errorMessage
        })

        return {
          ...prev,
          loading: newLoading,
          errors: newErrors,
        }
      })
    }
  }, [])

  /**
   * Hydrates the hook with pre-generated summaries (e.g. from pipeline).
   * Merges incoming summaries into state and sets hasGenerated = true.
   */
  const hydrate = useCallback((summaries: AISummaryResponse[]) => {
    if (!summaries || summaries.length === 0) return
    setState(prev => {
      const newErrors: Record<string, string | null> = { ...prev.errors }
      const merged = [...prev.summaries]

      summaries.forEach(s => {
        // Replace existing summary for same provider, or add new
        const idx = merged.findIndex(existing => existing.provider === s.provider)
        if (idx >= 0) {
          merged[idx] = s
        } else {
          merged.push(s)
        }
        if (s.success) {
          newErrors[s.provider] = null
        } else {
          newErrors[s.provider] = s.error || 'Failed to generate summary'
        }
      })

      return {
        summaries: merged,
        loading: {},
        errors: newErrors,
        hasGenerated: true,
      }
    })
  }, [])

  /**
   * Resets the summary state to initial values
   * Clears all summaries, loading states, errors, and resets hasGenerated flag
   */
  const reset = useCallback(() => {
    setState({
      summaries: [],
      loading: {},
      errors: {},
      hasGenerated: false,
    })
  }, [])

  /**
   * Checks if any provider is currently loading
   * @returns True if at least one provider is in loading state
   */
  const isLoading = Object.values(state.loading).some(loading => loading)

  /**
   * Gets summary for a specific provider
   * 
   * @param provider - Provider key to get summary for
   * @returns AISummaryResponse if found, undefined otherwise
   */
  const getSummaryForProvider = useCallback((provider: LLMProviderKey): AISummaryResponse | undefined => {
    return state.summaries.find(s => s.provider === provider)
  }, [state.summaries])

  /**
   * Checks if a specific provider has an error
   * 
   * @param provider - Provider key to check
   * @returns True if provider has an error, false otherwise
   */
  const hasError = useCallback((provider: LLMProviderKey): boolean => {
    return !!state.errors[provider]
  }, [state.errors])

  /**
   * Gets error message for a specific provider
   * 
   * @param provider - Provider key to get error for
   * @returns Error message string or null if no error
   */
  const getError = useCallback((provider: LLMProviderKey): string | null => {
    return state.errors[provider] || null
  }, [state.errors])

  /**
   * Checks if a specific provider is currently loading
   * 
   * @param provider - Provider key to check
   * @returns True if provider is loading, false otherwise
   */
  const isProviderLoading = useCallback((provider: LLMProviderKey): boolean => {
    return state.loading[provider] || false
  }, [state.loading])

  return {
    summaries: state.summaries,
    loading: state.loading,
    errors: state.errors,
    hasGenerated: state.hasGenerated,
    isLoading,
    generateSummary,
    hydrate,
    reset,
    getSummaryForProvider,
    hasError,
    getError,
    isProviderLoading,
  }
}

