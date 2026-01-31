'use client'

import { useEffect, useState, useRef } from 'react'
import { useUrlValidation } from '@/hooks/useUrlValidation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UrlDetectionMessage } from './UrlDetectionMessage'

interface UrlDetectionInfo {
  type: 'channel' | 'playlist'
  name: string
  url: string
}

interface UrlInputProps {
  onSubmit?: (url: string) => void
  placeholder?: string
  className?: string
  detectionMessage?: UrlDetectionInfo | null
  onCopyUrl?: (url: string) => void
  externalUrl?: string | null
  onExternalUrlCleared?: () => void
  onClearDetectionMessage?: () => void
}

/**
 * URL input component with real-time validation
 */
export function UrlInput({ 
  onSubmit, 
  placeholder = 'Enter YouTube URL (video, channel, or playlist)',
  className,
  detectionMessage,
  onCopyUrl,
  externalUrl,
  onExternalUrlCleared,
  onClearDetectionMessage
}: UrlInputProps) {
  const { url, setUrl, validationResult, isValidating, isValid, reset } = useUrlValidation()
  const [showPastedFeedback, setShowPastedFeedback] = useState(false)
  const lastSyncedExternalUrl = useRef<string | null>(null)

  // Sync external URL with internal state - only when externalUrl prop changes
  useEffect(() => {
    // Only sync if externalUrl is set and different from what we last synced
    if (externalUrl && externalUrl !== lastSyncedExternalUrl.current) {
      setUrl(externalUrl)
      lastSyncedExternalUrl.current = externalUrl
      setShowPastedFeedback(true)
      // Hide feedback after 3 seconds
      const timer = setTimeout(() => {
        setShowPastedFeedback(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
    // Clear the ref when externalUrl is cleared (null)
    if (!externalUrl) {
      lastSyncedExternalUrl.current = null
    }
  }, [externalUrl, setUrl])

  const handleCopyUrl = (urlToCopy: string) => {
    setUrl(urlToCopy)
    setShowPastedFeedback(true)
    // Hide feedback after 3 seconds
    setTimeout(() => {
      setShowPastedFeedback(false)
    }, 3000)
    if (onCopyUrl) {
      onCopyUrl(urlToCopy)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && url.trim() && onSubmit) {
      onSubmit(url.trim())
    }
  }

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    }
    if (validationResult) {
      if (isValid) {
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      }
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    return null
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-2', className)}>
      <div className="relative">
        <Input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            // Clear external URL when user manually types/pastes
            // This prevents external URL from overwriting manual input
            if (externalUrl && onExternalUrlCleared) {
              onExternalUrlCleared()
            }
            // Clear detection message when user manually changes the URL
            if (detectionMessage && onClearDetectionMessage) {
              onClearDetectionMessage()
            }
          }}
          onPaste={(e) => {
            // Handle paste event - the onChange will also fire, but we want to clear external URL immediately
            if (externalUrl && onExternalUrlCleared) {
              onExternalUrlCleared()
            }
            // Clear detection message when user manually pastes a URL
            if (detectionMessage && onClearDetectionMessage) {
              onClearDetectionMessage()
            }
          }}
          placeholder={placeholder}
          className={cn(
            'pr-10',
            validationResult && !isValid && 'border-red-500 focus-visible:ring-red-500',
            isValid && 'border-green-500 focus-visible:ring-green-500'
          )}
          aria-invalid={validationResult ? !isValid : undefined}
          aria-describedby={validationResult && !isValid ? 'url-error' : undefined}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getValidationIcon()}
        </div>
      </div>
      
      {validationResult && !isValid && validationResult.error && (
        <p 
          id="url-error" 
          className="text-sm text-red-500" 
          role="alert"
        >
          {validationResult.error}
        </p>
      )}
      
      {showPastedFeedback && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-top-1 duration-300">
          <Check className="h-4 w-4" />
          <span>URL pasted into input field</span>
        </div>
      )}
      
      {validationResult && isValid && !showPastedFeedback && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Valid {validationResult.type} URL
        </p>
      )}

      {detectionMessage && (
        <UrlDetectionMessage
          type={detectionMessage.type}
          name={detectionMessage.name}
          url={detectionMessage.url}
          onCopyUrl={handleCopyUrl}
        />
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!isValid || isValidating}
          className="flex-1 sm:flex-initial"
        >
          Get Transcript
        </Button>
        {url && (
          <Button
            type="button"
            variant="outline"
            onClick={reset}
          >
            Clear
          </Button>
        )}
        <a
          href="/how-it-works.html"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          How It Works
        </a>
      </div>
    </form>
  )
}





