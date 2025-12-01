/**
 * Shared logging utility
 * Respects DEBUG environment variable for controlling log verbosity
 */

/**
 * Check if debugging is enabled via environment variable
 * DEBUG=true enables all logging, DEBUG=false (default) only shows errors and warnings
 */
export function isDebugEnabled(): boolean {
  const debugFlag = process.env.DEBUG || process.env.NEXT_PUBLIC_DEBUG
  return debugFlag === 'true' || debugFlag === '1'
}

/**
 * Creates a logger instance with optional service name prefix
 * @param serviceName - Optional service name to prefix log messages (e.g., 'ytdlp-service')
 * @returns Logger object with debug, info, warn, and error methods
 */
export function createLogger(serviceName?: string): {
  debug: (message: string, context?: Record<string, unknown>) => void
  info: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => void
} {
  const prefix = serviceName ? `[${serviceName}]` : ''
  
  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      if (isDebugEnabled()) {
        console.debug(`${prefix} DEBUG: ${message}`, context ? JSON.stringify(context, null, 2) : '')
      }
    },
    info: (message: string, context?: Record<string, unknown>) => {
      if (isDebugEnabled()) {
        console.log(`${prefix} INFO: ${message}`, context || '')
      }
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      // Warnings are always shown
      console.warn(`${prefix} WARNING: ${message}`, context || '')
    },
    error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
      // Errors are always shown
      const errorDetails = error instanceof Error 
        ? { message: error.message, stack: error.stack, name: error.name }
        : { error: String(error) }
      console.error(`${prefix} ERROR: ${message}`, {
        ...errorDetails,
        ...context,
      })
    },
  }
}

/**
 * Default logger instance (for backward compatibility)
 */
export const logger = createLogger('app')

