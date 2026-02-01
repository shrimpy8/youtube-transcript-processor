import { describe, it, expect } from 'vitest'
import {
  formatEpisodeDate,
  formatAbsoluteDate,
  formatRelativeDate,
  formatHeaderDate,
} from '../date-display-utils'

// Helper: create a local date at noon to avoid timezone day-boundary issues
function localNoon(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0)
}

describe('formatRelativeDate', () => {
  const now = localNoon(2026, 1, 31)

  it('returns "Today" for today', () => {
    expect(formatRelativeDate(localNoon(2026, 1, 31), now)).toBe('Today')
  })

  it('returns "1d ago" for yesterday', () => {
    expect(formatRelativeDate(localNoon(2026, 1, 30), now)).toBe('1d ago')
  })

  it('returns "3d ago" for 3 days ago', () => {
    expect(formatRelativeDate(localNoon(2026, 1, 28), now)).toBe('3d ago')
  })

  it('returns "1w ago" for 7–13 days ago', () => {
    expect(formatRelativeDate(localNoon(2026, 1, 24), now)).toBe('1w ago')
  })

  it('returns weeks for 14–29 days ago', () => {
    expect(formatRelativeDate(localNoon(2026, 1, 10), now)).toBe('3w ago')
  })

  it('returns "1mo ago" for 30–59 days ago', () => {
    expect(formatRelativeDate(localNoon(2025, 12, 31), now)).toBe('1mo ago')
  })

  it('returns months for 60–364 days ago', () => {
    expect(formatRelativeDate(localNoon(2025, 9, 1), now)).toBe('5mo ago')
  })

  it('returns "1y ago" for 365–729 days ago', () => {
    expect(formatRelativeDate(localNoon(2025, 1, 1), now)).toBe('1y ago')
  })

  it('returns "Today" for future dates', () => {
    expect(formatRelativeDate(localNoon(2026, 2, 1), now)).toBe('Today')
  })
})

describe('formatAbsoluteDate', () => {
  const ref = localNoon(2026, 1, 31)

  it('omits year for same year', () => {
    expect(formatAbsoluteDate(localNoon(2026, 1, 29), ref)).toBe('Jan 29')
  })

  it('includes year for different year', () => {
    expect(formatAbsoluteDate(localNoon(2025, 12, 15), ref)).toBe('Dec 15, 2025')
  })
})

describe('formatEpisodeDate', () => {
  const now = localNoon(2026, 1, 31)

  it('formats same-year date with relative', () => {
    // Use local noon ISO string to avoid timezone shifts
    const jan29 = localNoon(2026, 1, 29).toISOString()
    expect(formatEpisodeDate(jan29, now)).toBe('Jan 29 · 2d ago')
  })

  it('formats cross-year date with year and relative', () => {
    const dec15 = localNoon(2025, 12, 15).toISOString()
    expect(formatEpisodeDate(dec15, now)).toBe('Dec 15, 2025 · 1mo ago')
  })

  it('returns "Unknown date" for invalid input', () => {
    expect(formatEpisodeDate('not-a-date', now)).toBe('Unknown date')
  })

  it('formats today correctly', () => {
    const today = localNoon(2026, 1, 31).toISOString()
    expect(formatEpisodeDate(today, now)).toBe('Jan 31 · Today')
  })
})

describe('formatHeaderDate', () => {
  it('formats header date with year', () => {
    expect(formatHeaderDate(localNoon(2026, 1, 31))).toBe('Today: Jan 31, 2026')
  })

  it('formats a date in December', () => {
    expect(formatHeaderDate(localNoon(2025, 12, 25))).toBe('Today: Dec 25, 2025')
  })
})
