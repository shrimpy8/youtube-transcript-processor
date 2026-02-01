import { TranscriptSegment } from '@/types'
import { parseSrtContent } from './srt-parser'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { normalizeVideoUrl } from './url-utils'
import { mapYtDlpError } from './error-mapper'
import { createTimer } from './utils'
import {
  ytdlpLogger as logger,
  getYtDlpInstance,
  extractVideoIdOrUnknown,
  type SubtitleOptions,
} from './ytdlp-core'

/**
 * Downloads subtitles for a YouTube video
 * @param videoUrl - YouTube video URL or video ID
 * @param options - Subtitle download options
 * @returns Transcript segments parsed from SRT
 */
export async function downloadSubtitles(
  videoUrl: string,
  options: SubtitleOptions = {}
): Promise<TranscriptSegment[]> {
  const timer = createTimer()
  timer.start()
  logger.info('Starting subtitle download', { videoUrl, options })

  const ytDlp = getYtDlpInstance()
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ytdlp-'))
  logger.debug('Created temp directory', { tempDir })

  try {
    const fullUrl = normalizeVideoUrl(videoUrl)
    const videoId = extractVideoIdOrUnknown(fullUrl) === 'unknown' ? 'video' : extractVideoIdOrUnknown(fullUrl)
    logger.debug('Extracted video ID', { videoId, fullUrl })

    const args: string[] = [
      fullUrl,
      '--write-auto-subs',
      '--skip-download',
      '--sub-lang', options.language || 'en',
      '--convert-subs', 'srt',
      '--sub-format', options.format || 'srt',
      '-o', path.join(tempDir, `${videoId}.%(ext)s`),
      '--no-warnings',
      '--quiet',
    ]
    logger.debug('yt-dlp command args', { args })

    try {
      logger.info('Executing yt-dlp command')
      await ytDlp.execPromise(args)
      logger.debug('yt-dlp command completed successfully')
    } catch (error) {
      logger.warn('yt-dlp command threw error, checking for output files', { error })
      const files = await fs.readdir(tempDir).catch(() => [])
      logger.debug('Files in temp directory', { files, count: files.length })
      if (files.length === 0) {
        logger.error('No files created after yt-dlp execution', error, { videoUrl, tempDir })
        throw error
      }
      logger.info('Files found despite error, continuing', { files })
    }

    // Find the downloaded subtitle file
    const possibleFiles = [
      path.join(tempDir, `${videoId}.srt`),
      path.join(tempDir, `${videoId}.en.srt`),
      path.join(tempDir, `${videoId}.${options.language || 'en'}.srt`),
    ]
    logger.debug('Checking for subtitle files', { possibleFiles })

    let srtFile: string | null = null
    for (const file of possibleFiles) {
      try {
        await fs.access(file)
        srtFile = file
        logger.debug('Found subtitle file', { srtFile })
        break
      } catch {
        continue
      }
    }

    if (!srtFile) {
      const files = await fs.readdir(tempDir)
      const srtFiles = files.filter(f => f.endsWith('.srt'))
      logger.debug('Searching for any .srt files', { files, srtFiles })
      if (srtFiles.length > 0) {
        srtFile = path.join(tempDir, srtFiles[0])
        logger.info('Found alternative subtitle file', { srtFile })
      }
    }

    if (!srtFile) {
      const files = await fs.readdir(tempDir).catch(() => [])
      logger.error('No subtitle file found', undefined, {
        videoUrl,
        tempDir,
        files,
        possibleFiles,
      })
      throw new Error('No subtitle file found after download')
    }

    logger.info('Reading and parsing SRT file', { srtFile })
    const srtContent = await fs.readFile(srtFile)
    const segments = parseSrtContent(srtContent)
    logger.info('Parsed SRT file', { segmentCount: segments.length, srtFile })

    if (segments.length === 0) {
      logger.error('No transcript segments found in subtitle file', undefined, { srtFile })
      throw new Error('No transcript segments found in subtitle file')
    }

    logger.info('Subtitle download completed successfully', {
      segmentCount: segments.length,
      duration: timer.elapsedMs(),
    })
    return segments
  } catch (error) {
    logger.error('Subtitle download failed', error, {
      videoUrl,
      options,
      duration: timer.elapsedMs(),
    })
    const videoId = extractVideoIdOrUnknown(videoUrl)
    throw mapYtDlpError(error, { videoId })
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
      logger.debug('Cleaned up temp directory', { tempDir })
    } catch (cleanupError) {
      logger.warn('Failed to clean up temp directory', { tempDir, error: cleanupError })
    }
  }
}
