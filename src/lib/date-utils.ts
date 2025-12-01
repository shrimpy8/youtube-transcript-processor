/**
 * Date and time formatting utilities
 */

/**
 * Formats duration in seconds to readable format (HH:MM:SS or MM:SS)
 * @param seconds - Duration in seconds
 * @param includeHours - Whether to always include hours (default: false, auto-detects)
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number, includeHours?: boolean): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (includeHours || hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Formats timestamp in seconds to readable format (same as formatDuration)
 * @param seconds - Timestamp in seconds
 * @returns Formatted timestamp string
 */
export function formatTimestamp(seconds: number): string {
  return formatDuration(seconds)
}

/**
 * Formats a date string to a readable format
 * @param dateString - ISO date string or date string
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(
  dateString: string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return ''
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
    
    return date.toLocaleDateString('en-US', options || defaultOptions)
  } catch {
    return ''
  }
}

/**
 * Converts upload date from yt-dlp format (YYYYMMDD) to ISO format (YYYY-MM-DD)
 * @param uploadDate - Upload date in YYYYMMDD format
 * @returns Date string in YYYY-MM-DD format or undefined if invalid
 */
export function formatUploadDate(uploadDate: string | undefined | null): string | undefined {
  if (!uploadDate || uploadDate.length !== 8) {
    return undefined
  }
  
  try {
    // Format: YYYYMMDD -> YYYY-MM-DD
    const year = uploadDate.slice(0, 4)
    const month = uploadDate.slice(4, 6)
    const day = uploadDate.slice(6, 8)
    
    // Validate the date components
    const yearNum = parseInt(year, 10)
    const monthNum = parseInt(month, 10)
    const dayNum = parseInt(day, 10)
    
    if (
      isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) ||
      monthNum < 1 || monthNum > 12 ||
      dayNum < 1 || dayNum > 31
    ) {
      return undefined
    }
    
    return `${year}-${month}-${day}`
  } catch {
    return undefined
  }
}

/**
 * Time formatting utilities for subtitle formats
 */

/**
 * Format time for SRT format (HH:MM:SS,mmm)
 * @param seconds - Time in seconds
 * @returns Formatted SRT time string
 */
export function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

/**
 * Format time for VTT format (HH:MM:SS.mmm)
 * @param seconds - Time in seconds
 * @returns Formatted VTT time string
 */
export function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

