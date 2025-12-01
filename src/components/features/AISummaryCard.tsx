'use client'

import { AISummaryResponse } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Download, Check, AlertCircle } from 'lucide-react'
import { copyToClipboard } from '@/lib/clipboard-utils'
import { downloadAISummary } from '@/lib/export-utils'

/**
 * Props for AISummaryCard component
 */
interface AISummaryCardProps {
  /** Summary response object (undefined if not yet generated or failed) */
  summary: AISummaryResponse | undefined
  /** Error message string (null if no error) */
  error: string | null
  /** Boolean indicating if this provider has an error */
  hasError: boolean
  /** User-friendly provider label for display */
  providerLabel: string
  /** Provider key identifier */
  providerKey: string
  /** Optional video title for download filename */
  videoTitle?: string
  /** Currently copied provider key (for showing "Copied!" state) */
  copiedProvider: string | null
  /** Callback function when copy button is clicked */
  onCopy: (provider: string) => void
}

/**
 * Reusable component for displaying a single AI summary card
 * 
 * Displays summary content, error states, and provides copy/download actions.
 * Handles both success and error states gracefully.
 * 
 * @param props - Component props
 * @returns JSX element or null if no summary and no error
 * 
 * @remarks
 * - Returns null if neither summary nor error is present
 * - Shows error UI if hasError is true or summary.success is false
 * - Shows success UI with copy/download buttons if summary is successful
 */
export function AISummaryCard({
  summary,
  error,
  hasError,
  providerLabel,
  providerKey,
  videoTitle,
  copiedProvider,
  onCopy,
}: AISummaryCardProps) {
  // Don't render if no summary and no error
  if (!summary && !hasError) {
    return null
  }

  /**
   * Handles copy action - copies summary text to clipboard
   * Shows "Copied!" feedback via onCopy callback
   */
  const handleCopy = async () => {
    if (summary?.summary) {
      try {
        await copyToClipboard(summary.summary)
        onCopy(providerKey)
      } catch (error) {
        console.error('Failed to copy summary:', error)
      }
    }
  }

  /**
   * Handles download action - triggers download of summary as .txt file
   */
  const handleDownload = () => {
    if (summary?.summary && summary?.modelName) {
      downloadAISummary(summary.summary, summary.modelName, videoTitle)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{providerLabel}</CardTitle>
          {summary && summary.success && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copiedProvider === providerKey ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {summary && summary.success ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {summary.summary}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error || 'Failed to generate summary'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

