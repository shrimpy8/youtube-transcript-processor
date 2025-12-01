'use client'

import { useState, useCallback } from 'react'
import { LLMProvider, AISummaryResponse, AISummaryState } from '@/types'
import { generateAISummary } from '@/lib/api-client'
import { ALL_PROVIDERS, type LLMProviderKey } from '@/lib/llm-config'
import { extractErrorMessage } from '@/lib/utils'

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
    provider: LLMProvider
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
    const providersToLoad: LLMProviderKey[] = 
      provider === 'all' 
        ? ALL_PROVIDERS
        : [provider]

    // Initialize loading and error states for selected providers
    setState(prev => {
      const newLoading: Record<string, boolean> = { ...prev.loading }
      const newErrors: Record<string, string | null> = { ...prev.errors }
      
      providersToLoad.forEach(p => {
        newLoading[p] = true
        newErrors[p] = null
      })
      
      return {
        ...prev,
        loading: newLoading,
        errors: newErrors,
      }
    })

    try {
      // Generate summaries via API
      const summaries = await generateAISummary(transcript, provider)
      
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
        
        // Mark all providers as failed
        providersToLoad.forEach(p => {
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
    reset,
    getSummaryForProvider,
    hasError,
    getError,
    isProviderLoading,
  }
}

