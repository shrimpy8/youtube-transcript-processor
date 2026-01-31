/**
 * LLM Provider Configuration
 * Centralized configuration for all LLM providers
 * 
 * This module provides a single source of truth for all LLM provider settings,
 * including environment variable names, default models, and display names.
 * Adding a new provider requires only updating this configuration file.
 */

/**
 * Supported LLM provider keys
 */
export type LLMProviderKey = 'anthropic' | 'google-gemini' | 'perplexity'

/**
 * Configuration structure for a single LLM provider
 */
export interface ProviderConfig {
  /** Environment variable name for the API key */
  apiKeyEnv: string
  /** Environment variable name for the model identifier */
  modelEnv: string
  /** Environment variable name for the user-friendly model name */
  modelNameEnv: string
  /** Default model identifier if not set in environment */
  defaultModel: string
  /** Default user-friendly model name if not set in environment */
  defaultModelName: string
  /** Maximum output tokens for summary generation */
  maxOutputTokens: number
}

/**
 * Provider configuration map
 * Contains all configuration for each supported LLM provider
 * 
 * @remarks To add a new provider, add an entry here with the appropriate configuration
 */
export const PROVIDER_CONFIG: Record<LLMProviderKey, ProviderConfig> = {
  'anthropic': {
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'ANTHROPIC_MODEL',
    modelNameEnv: 'ANTHROPIC_MODEL_NAME',
    defaultModel: 'claude-sonnet-4-5-20250929',
    defaultModelName: 'Anthropic Sonnet 4.5',
    maxOutputTokens: 16384,
  },
  'google-gemini': {
    apiKeyEnv: 'GOOGLE_GEMINI_API_KEY',
    modelEnv: 'GOOGLE_GEMINI_MODEL',
    modelNameEnv: 'GOOGLE_GEMINI_MODEL_NAME',
    defaultModel: 'gemini-2.5-flash',
    defaultModelName: 'Google Gemini 2.5 Flash',
    maxOutputTokens: 16384,
  },
  'perplexity': {
    apiKeyEnv: 'PERPLEXITY_API_KEY',
    modelEnv: 'PERPLEXITY_MODEL',
    modelNameEnv: 'PERPLEXITY_MODEL_NAME',
    defaultModel: 'sonar',
    defaultModelName: 'Perplexity Sonar',
    maxOutputTokens: 16384,
  },
}

/**
 * All provider keys as an array
 * Used for iterating over all providers when generating summaries for all
 */
export const ALL_PROVIDERS: LLMProviderKey[] = ['anthropic', 'google-gemini', 'perplexity']

/**
 * Gets environment variable value with fallback
 * 
 * @param key - Environment variable name
 * @param fallback - Default value if environment variable is not set
 * @returns Environment variable value or fallback
 */
export function getEnvVar(key: string, fallback: string): string {
  return process.env[key] || fallback
}

/**
 * Gets provider configuration for a specific provider
 * 
 * @param provider - Provider key ('anthropic', 'google-gemini', or 'perplexity')
 * @returns ProviderConfig object with all configuration for the provider
 * @throws Error if provider is not found in configuration (should never happen with TypeScript)
 */
export function getProviderConfig(provider: LLMProviderKey): ProviderConfig {
  const config = PROVIDER_CONFIG[provider]
  if (!config) {
    throw new Error(`Provider configuration not found for: ${provider}`)
  }
  return config
}

/**
 * Gets API key for a specific provider from environment variables
 * 
 * @param provider - Provider key
 * @returns API key string or undefined if not configured
 */
export function getProviderApiKey(provider: LLMProviderKey): string | undefined {
  const config = getProviderConfig(provider)
  return process.env[config.apiKeyEnv]
}

/**
 * Gets user-friendly model name for a specific provider
 * Falls back to default if not set in environment variables
 * 
 * @param provider - Provider key
 * @returns User-friendly model name string
 */
export function getProviderModelName(provider: LLMProviderKey): string {
  const config = getProviderConfig(provider)
  return getEnvVar(config.modelNameEnv, config.defaultModelName)
}

