/**
 * Date display utilities for the Favorite Channels feature.
 * Provides absolute + relative date formatting without external libraries.
 * ADR-006: Custom utility chosen over date-fns/dayjs for minimal dependency.
 */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Formats a date for episode display.
 * Returns: "Jan 29 · 2d ago" (same year) or "Dec 15, 2025 · 47d ago" (different year)
 */
export function formatEpisodeDate(publishedAt: string, now?: Date): string {
  const date = new Date(publishedAt)
  if (isNaN(date.getTime())) return 'Unknown date'

  const absolute = formatAbsoluteDate(date, now)
  const relative = formatRelativeDate(date, now)
  return `${absolute} · ${relative}`
}

/**
 * Formats absolute date: "Jan 29" (same year) or "Jan 29, 2025" (different year)
 */
export function formatAbsoluteDate(date: Date, referenceDate?: Date): string {
  const ref = referenceDate ?? new Date()
  const month = MONTHS_SHORT[date.getMonth()]
  const day = date.getDate()

  if (date.getFullYear() !== ref.getFullYear()) {
    return `${month} ${day}, ${date.getFullYear()}`
  }
  return `${month} ${day}`
}

/**
 * Formats relative date: "Today", "1d ago", "2d ago", "1w ago", "2w ago", "1mo ago", etc.
 */
export function formatRelativeDate(date: Date, now?: Date): string {
  const reference = now ?? new Date()
  const diffMs = reference.getTime() - date.getTime()

  // Handle future dates or same instant
  if (diffMs < 0) return 'Today'

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 14) return '1w ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 60) return '1mo ago'
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  if (diffDays < 730) return '1y ago'
  return `${Math.floor(diffDays / 365)}y ago`
}

/**
 * Formats the header date: "Today: Jan 31, 2026"
 * Always includes year.
 */
export function formatHeaderDate(now?: Date): string {
  const date = now ?? new Date()
  const month = MONTHS_SHORT[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  return `Today: ${month} ${day}, ${year}`
}
