/**
 * yt-dlp service — barrel re-export
 *
 * The implementation has been split into focused modules:
 *   ytdlp-core.ts       — shared types, singleton, helpers
 *   ytdlp-subtitles.ts  — subtitle downloading
 *   ytdlp-video-info.ts — video metadata retrieval and enrichment
 *   ytdlp-listing.ts    — playlist and channel video listing
 *   ytdlp-channel.ts    — channel info extraction from videos
 *
 * This file re-exports the public API so existing consumers are unaffected.
 */

// Types
export type { SubtitleOptions, YtDlpVideoInfo } from './ytdlp-core'

// Utilities
export { extractVideoIdFromUrl } from './ytdlp-core'

// Subtitles
export { downloadSubtitles } from './ytdlp-subtitles'

// Video info
export { getVideoInfo } from './ytdlp-video-info'

// Listing
export { getPlaylistVideos, getChannelVideos } from './ytdlp-listing'

// Channel
export { getChannelInfoFromVideo } from './ytdlp-channel'
