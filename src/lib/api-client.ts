import { TranscriptSegment, ChannelInfo, ChannelDetails, VideoMetadata, LLMProvider, AISummaryResponse, SummaryStyle } from '@/types'
import type { LLMProviderKey } from '@/lib/llm-config'
import { AppError, ErrorType, NoTranscriptError, VideoNotFoundError, NetworkError, RateLimitError } from './errors'
import { extractErrorMessage } from './utils'

/**
 * Request deduplication: Track in-flight requests by URL
 * Prevents duplicate concurrent requests for the same resource
 */
const inFlightRequests = new Map<string, Promise<unknown>>()

/**
 * Helper to handle HTTP error responses
 * Returns error response instead of throwing
 */
function handleHttpError(
  response: Response,
  data: { type?: string; error?: string; message?: string },
  context: { videoId?: string; defaultError?: string }
): TranscriptResponse {
  const errorMessage = data.message || data.error || context.defaultError || 'An unexpected error occurred'
  const errorType = (data.type as ErrorType) || ErrorType.UNKNOWN
  
  return {
    success: false,
    error: errorMessage,
    type: errorType,
  }
}

/**
 * Helper to handle fetch errors
 * Returns error response instead of throwing
 */
function handleFetchError(error: unknown): TranscriptResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      type: error.type,
    }
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      success: false,
      error: 'Failed to connect to server',
      type: ErrorType.NETWORK_ERROR,
    }
  }
  return {
    success: false,
    error: extractErrorMessage(error, 'An unexpected error occurred'),
    type: ErrorType.UNKNOWN,
  }
}

export interface TranscriptResponse {
  success: boolean
  data?: {
    videoId: string
    segments: TranscriptSegment[]
    segmentCount: number
    title?: string
    channelTitle?: string
    publishedAt?: string
    thumbnail?: string
    duration?: number
  }
  error?: string
  type?: string
  suggestion?: string
}

export interface DiscoverResponse {
  success: boolean
  data?: ChannelInfo
  error?: string
  type?: string
}

/**
 * Fetches transcript using yt-dlp
 * @param videoId - YouTube video ID
 * @param options - Optional subtitle options
 */
export async function fetchTranscriptWithYtDlp(
  videoId: string,
  options?: { language?: string; format?: string; writeAutoSubs?: boolean }
): Promise<TranscriptResponse> {
  try {
    const response = await fetch('/api/transcript/ytdlp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId, options }),
    })

    const data: TranscriptResponse = await response.json()

    if (!response.ok) {
      return handleHttpError(response, data, {
        videoId,
        defaultError: 'Failed to fetch transcript'
      })
    }

    return data
  } catch (error) {
    return handleFetchError(error)
  }
}

/**
 * Fetches transcript by URL using yt-dlp
 * @param url - YouTube video URL
 * @param options - Optional subtitle options
 */
export async function fetchTranscriptByUrlWithYtDlp(
  url: string,
  options?: { language?: string; format?: string; writeAutoSubs?: boolean }
): Promise<TranscriptResponse> {
  try {
    const response = await fetch('/api/transcript/ytdlp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, options }),
    })

    const data: TranscriptResponse = await response.json()

    if (!response.ok) {
      const videoId = url.match(/[?&]v=([^&]+)/)?.[1] || 'unknown'
      return handleHttpError(response, data, {
        videoId,
        defaultError: 'Failed to fetch transcript'
      })
    }

    return data
  } catch (error) {
    return handleFetchError(error)
  }
}

/**
 * Discovers videos from a playlist or channel
 * @param url - YouTube playlist or channel URL
 * @param type - Type of URL ('playlist' or 'channel')
 * @param maxVideos - Maximum number of videos to return
 */
export async function discoverVideos(
  url: string,
  type: 'playlist' | 'channel',
  maxVideos: number = 100
): Promise<DiscoverResponse> {
  try {
    const response = await fetch('/api/discover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, type, maxVideos }),
    })

    const data: DiscoverResponse = await response.json()

    if (!response.ok) {
      const errorMessage = data.error || 'Failed to discover videos'
      throw new AppError(ErrorType.UNKNOWN, errorMessage)
    }

    return data
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(ErrorType.UNKNOWN, extractErrorMessage(error, 'Failed to discover videos'))
  }
}


export interface ChannelInfoResponse {
  success: boolean
  data?: {
    channel: ChannelDetails
    videos: VideoMetadata[]
  }
  error?: string
  type?: string
  suggestion?: string
}

/**
 * Fetches channel information from a video URL
 * Includes request deduplication to prevent concurrent duplicate requests
 * @param videoUrl - YouTube video URL
 * @returns Channel details and top 10 videos
 */
export async function fetchChannelInfoFromVideo(
  videoUrl: string
): Promise<ChannelInfoResponse> {
  // Check if there's already an in-flight request for this URL
  const existingRequest = inFlightRequests.get(videoUrl)
  if (existingRequest) {
    // Return the existing promise to avoid duplicate requests
    return existingRequest as Promise<ChannelInfoResponse>
  }

  // Create new request promise
  const requestPromise = (async () => {
    try {
      const response = await fetch('/api/channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl }),
      })

      const data: ChannelInfoResponse = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to fetch channel information'
        throw new AppError(ErrorType.UNKNOWN, errorMessage)
      }

      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(ErrorType.UNKNOWN, extractErrorMessage(error, 'Failed to fetch channel information'))
    } finally {
      // Remove from in-flight requests when done
      inFlightRequests.delete(videoUrl)
    }
  })()

  // Store the promise for deduplication
  inFlightRequests.set(videoUrl, requestPromise)

  return requestPromise
}

/**
 * AI Summary API response
 */
export interface AISummaryApiResponse {
  success: boolean
  summaries: AISummaryResponse[]
  error?: string
}

/**
 * Generates AI summary from transcript using selected LLM provider(s)
 * @param transcript - Full transcript text
 * @param provider - LLM provider to use ('anthropic', 'google-gemini', 'perplexity', or 'all')
 * @param summaryStyle - Summary style ('bullets', 'narrative', or 'technical'). Defaults to 'bullets'
 * @param videoUrl - YouTube video URL for timestamp links (used only for bullets style)
 * @returns Array of summary responses (one per provider)
 */
export async function generateAISummary(
  transcript: string,
  provider: LLMProvider,
  summaryStyle: SummaryStyle = 'bullets',
  videoUrl?: string
): Promise<AISummaryResponse[]> {
  try {
    const response = await fetch('/api/ai-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript,
        provider,
        summaryStyle,
        videoUrl,
      }),
    })

    const data: AISummaryApiResponse = await response.json()

    if (!response.ok) {
      handleHttpError(response, data, {
        defaultError: 'Failed to generate AI summary'
      })
    }

    if (!data.success || !data.summaries) {
      throw new AppError(
        ErrorType.PROCESSING_ERROR,
        data.error || 'Failed to generate AI summary'
      )
    }

    return data.summaries
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(ErrorType.UNKNOWN, extractErrorMessage(error, 'Failed to generate AI summary'))
  }
}

/**
 * Response from the provider config endpoint
 */
export interface ProviderConfigResponse {
  success: boolean
  providers: Record<LLMProviderKey, boolean>
}

/**
 * Fetches which LLM providers have API keys configured
 * Fail-open: returns all-true on error so the UI doesn't block users unnecessarily
 */
export async function fetchProviderConfig(): Promise<Record<LLMProviderKey, boolean>> {
  try {
    const response = await fetch('/api/ai-summary/config')
    const data: ProviderConfigResponse = await response.json()
    if (data.success && data.providers) {
      return data.providers
    }
  } catch {
    // Fail-open: if config endpoint is unreachable, assume all configured
  }
  return { anthropic: true, 'google-gemini': true, perplexity: true }
}

