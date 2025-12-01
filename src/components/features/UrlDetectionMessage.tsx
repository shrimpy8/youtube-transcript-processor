'use client'

import { useState } from 'react'
import { Info, Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/clipboard-utils'
import { cn } from '@/lib/utils'

interface UrlDetectionMessageProps {
  type: 'channel' | 'playlist'
  name: string
  url: string
  onCopyUrl: (url: string) => void
  className?: string
}

/**
 * Component that displays a detection message when channel or playlist URL is detected
 */
export function UrlDetectionMessage({
  type,
  name,
  url,
  onCopyUrl,
  className
}: UrlDetectionMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await copyToClipboard(url)
      setCopied(true)
      onCopyUrl(url)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const typeLabel = type === 'channel' ? 'Channel' : 'Playlist'
  const tabLabel = type === 'channel' ? 'Channel' : 'Playlist'

  return (
    <div
      className={cn(
        'p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
            We detected a <strong>{typeLabel}</strong> URL:{' '}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 dark:text-blue-300 hover:underline inline-flex items-center gap-1"
            >
              {name}
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            Go to the <strong>{tabLabel}</strong> tab to see the top 10 videos. Click &quot;Copy URL&quot; on a video, then click &quot;Paste URL&quot; to add it to the input field.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 text-xs border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                URL Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy URL
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

