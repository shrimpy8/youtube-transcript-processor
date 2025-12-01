/**
 * Design tokens for the application
 * Centralized design system values
 */

export const designTokens = {
  colors: {
    light: {
      background: '#ffffff',
      foreground: '#171717',
    },
    dark: {
      background: '#0a0a0a',
      foreground: '#ededed',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  breakpoints: {
    mobile: '640px',
    tablet: '1024px',
    desktop: '1280px',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
} as const

export type DesignTokens = typeof designTokens





