import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { validateAndParseUrl } from '@/lib/youtube-validator'
import { NoTranscriptError, VideoNotFoundError, NetworkError, RateLimitError } from '@/lib/errors'
import { TranscriptSegment } from '@/types'

/**
 * POST /api/transcript
 * Fetches transcript for a YouTube video
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, videoId } = body

    // Validate input
    if (!url && !videoId) {
      return NextResponse.json(
        { error: 'URL or videoId is required' },
        { status: 400 }
      )
    }

    // Extract video ID
    let finalVideoId: string | null = null
    
    if (videoId) {
      finalVideoId = videoId
    } else if (url) {
      const validation = validateAndParseUrl(url)
      if (!validation.isValid || validation.type !== 'video') {
        return NextResponse.json(
          { error: 'Invalid YouTube video URL' },
          { status: 400 }
        )
      }
      finalVideoId = validation.videoId
    }

    if (!finalVideoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID' },
        { status: 400 }
      )
    }

    // Fetch transcript
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(finalVideoId)
      
      // Check if transcript data is empty or invalid
      if (!transcriptData || !Array.isArray(transcriptData) || transcriptData.length === 0) {
        console.log(`No transcript found for video ${finalVideoId}`)
        throw new NoTranscriptError(finalVideoId)
      }
      
      // Transform to our format
      const segments: TranscriptSegment[] = transcriptData.map((item, index) => ({
        text: item.text,
        start: item.offset / 1000, // Convert milliseconds to seconds
        duration: index < transcriptData.length - 1
          ? (transcriptData[index + 1].offset - item.offset) / 1000
          : 0, // Last segment has 0 duration
      }))

      // Double-check segments are valid
      if (segments.length === 0) {
        console.log(`Transformed segments are empty for video ${finalVideoId}`)
        throw new NoTranscriptError(finalVideoId)
      }

      console.log(`Successfully fetched ${segments.length} segments for video ${finalVideoId}`)
      return NextResponse.json({
        success: true,
        data: {
          videoId: finalVideoId,
          segments,
          segmentCount: segments.length,
        },
      })
    } catch (error: unknown) {
      // Handle specific YouTube transcript errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('Transcript is disabled') || 
          errorMessage.includes('No transcript') ||
          errorMessage.includes('transcript not available')) {
        throw new NoTranscriptError(finalVideoId)
      }
      if (errorMessage.includes('Video unavailable')) {
        throw new VideoNotFoundError(finalVideoId)
      }
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        throw new RateLimitError()
      }
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        throw new NetworkError(errorMessage)
      }
      
      // Re-throw as generic error
      throw error
    }
  } catch (error: unknown) {
    // Handle known errors
    if (error instanceof NoTranscriptError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: error.type,
          suggestion: 'This video may not have captions enabled. Try another video.',
        },
        { status: error.statusCode }
      )
    }
    
    if (error instanceof VideoNotFoundError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: error.type,
        },
        { status: error.statusCode }
      )
    }
    
    if (error instanceof NetworkError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: error.type,
          suggestion: 'Please check your internet connection and try again.',
        },
        { status: error.statusCode }
      )
    }
    
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { 
          error: error.message,
          type: error.type,
          suggestion: 'Please wait a moment and try again.',
        },
        { status: error.statusCode }
      )
    }

    // Unknown error
    console.error('Transcript fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch transcript',
        type: 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

