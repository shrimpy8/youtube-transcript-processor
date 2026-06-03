import YTDlpWrap from 'yt-dlp-wrap'
import { createLogger, redactVideoUrl } from './logger'
import { extractVideoId } from './youtube-validator'

/**
 * Shared yt-dlp infrastructure: singleton instance, types, and helpers.
 */

// ---------------------------------------------------------------------------
// Timeout + concurrency helpers
// ---------------------------------------------------------------------------

/** Maximum milliseconds to wait for a single yt-dlp subprocess to complete. */
const YTDLP_TIMEOUT_MS = 30_000

/**
 * Races a promise against a wall-clock timeout.
 * Rejects with a descriptive Error if the timeout fires first.
 *
 * @param promise   - The promise to race (already running)
 * @param timeoutMs - Milliseconds before the timeout fires
 * @param label     - Short description for the timeout error message
 * @param onTimeout - Optional callback invoked when the timeout fires (e.g. to abort the child process)
 */
export async function execWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
  onTimeout?: () => void
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout?.()
      reject(new Error(`yt-dlp timeout after ${timeoutMs}ms: ${label}`))
    }, timeoutMs)
  })
  try {
    const result = await Promise.race([promise, timeout])
    clearTimeout(timeoutId)
    return result
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

/** Current number of in-flight yt-dlp subprocess calls. */
let activeYtdlpCalls = 0
/** Maximum concurrent yt-dlp subprocesses allowed across all routes. */
const MAX_CONCURRENT_YTDLP = 3

/**
 * Waits until a yt-dlp concurrency slot is available, then claims it.
 * Polls every 200 ms — intended only for short waits before subprocess launch.
 */
export async function acquireYtdlpSlot(): Promise<void> {
  while (activeYtdlpCalls >= MAX_CONCURRENT_YTDLP) {
    await new Promise<void>(resolve => setTimeout(resolve, 200))
  }
  activeYtdlpCalls++
}

/** Releases a previously acquired yt-dlp concurrency slot. */
export function releaseYtdlpSlot(): void {
  activeYtdlpCalls = Math.max(0, activeYtdlpCalls - 1)
}

/**
 * Convenience wrapper: acquires a concurrency slot FIRST, then starts the
 * yt-dlp subprocess via the provided thunk, enforces a 30-second timeout,
 * and releases the slot unconditionally.
 *
 * The thunk receives an AbortSignal that is wired directly to yt-dlp-wrap's
 * `bindAbortSignal` mechanism. When the timeout fires, `controller.abort()`
 * is called, which causes yt-dlp-wrap to send SIGTERM (and SIGKILL via
 * `pgrep -P … | xargs kill` on Unix) to the yt-dlp child process tree before
 * rejecting the promise. This fully resolves the background-zombie problem
 * that existed when using a bare `Promise.race()`.
 *
 * Usage — callers must forward the signal to execPromise:
 *   ytdlpExec(signal => ytDlp.execPromise(args, {}, signal), 'label')
 *
 * @param thunk - Factory that accepts an AbortSignal and returns the execPromise.
 *                The signal MUST be passed as the third argument to execPromise
 *                so yt-dlp-wrap can kill the child process on abort.
 * @param label - Short description for timeout error messages (URLs are redacted)
 */
export async function ytdlpExec<T>(thunk: (signal: AbortSignal) => Promise<T>, label: string): Promise<T> {
  const safeLabel = redactVideoUrl(label)
  const controller = new AbortController()
  await acquireYtdlpSlot()
  try {
    return await execWithTimeout(
      thunk(controller.signal),
      YTDLP_TIMEOUT_MS,
      safeLabel,
      () => controller.abort()
    )
  } finally {
    releaseYtdlpSlot()
  }
}

// Singleton yt-dlp-wrap instance (auto-downloads binary on first use)
let ytDlpWrapInstance: YTDlpWrap | null = null

export const ytdlpLogger = createLogger('ytdlp-service')

/** Common yt-dlp arguments for JSON metadata extraction */
export const YTDLP_JSON_ARGS = ['--dump-json', '--no-warnings', '--quiet', '--no-playlist'] as const

/**
 * Options for downloading subtitles
 */
export interface SubtitleOptions {
  language?: string // Language code (e.g., 'en', 'en-US')
  format?: 'srt' | 'vtt' | 'ass' | 'best'
  writeAutoSubs?: boolean // Use auto-generated subtitles if manual not available
}

/**
 * Video information from yt-dlp
 */
export interface YtDlpVideoInfo {
  id: string
  title: string
  url: string
  duration?: number
  thumbnail?: string
  channel?: string
  description?: string
  upload_date?: string
}

/**
 * Type for yt-dlp execPromise output
 */
export type YtDlpOutput = string | { stdout: string }

/**
 * Type for parsed yt-dlp JSON info
 */
export interface YtDlpJsonInfo {
  id?: string
  title?: string
  url?: string
  duration?: number
  thumbnail?: string
  channel?: string
  channel_id?: string
  channel_url?: string
  description?: string
  upload_date?: string
  view_count?: number
  [key: string]: unknown
}

/**
 * Get or create the singleton yt-dlp-wrap instance
 */
export function getYtDlpInstance(): YTDlpWrap {
  if (!ytDlpWrapInstance) {
    ytDlpWrapInstance = new YTDlpWrap()
  }
  return ytDlpWrapInstance
}

/**
 * Extract string output from yt-dlp execPromise result
 */
export function extractOutputString(output: YtDlpOutput): string {
  if (typeof output === 'string') {
    return output
  }
  if (output && typeof output === 'object' && 'stdout' in output) {
    return output.stdout
  }
  return String(output)
}

// Re-export from youtube-validator as the single source of truth for video ID extraction
export { extractVideoId as extractVideoIdFromUrl } from './youtube-validator'

/**
 * Extract video ID from a URL, returning 'unknown' if not found
 */
export function extractVideoIdOrUnknown(url: string): string {
  return extractVideoId(url) || url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1] || 'unknown'
}
