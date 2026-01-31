'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AISummaryResponse, SummaryStyle } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Download, Check, AlertCircle, FileText, Loader2, RotateCcw } from 'lucide-react'
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
  /** Summary style used for generation */
  summaryStyle?: SummaryStyle
  /** Currently copied provider key (for showing "Copied!" state) */
  copiedProvider: string | null
  /** Callback function when copy button is clicked */
  onCopy: (provider: string) => void
  /** Optional callback to retry generation after an error */
  onRetry?: () => void
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
  summaryStyle,
  copiedProvider,
  onCopy,
  onRetry,
}: AISummaryCardProps) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfDone, setPdfDone] = useState(false)

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
      downloadAISummary(summary.summary, summary.modelName, videoTitle, summaryStyle)
    }
  }

  /**
   * Handles PDF export - dynamically imports pdf-export and generates PDF
   */
  const handlePdfExport = async () => {
    if (!summary?.summary || !summary?.modelName) return

    setPdfLoading(true)
    try {
      const { generateSummaryPdf } = await import('@/lib/pdf-export')
      await generateSummaryPdf({
        title: videoTitle || 'AI Summary',
        provider: summary.modelName,
        summaryStyle: summaryStyle || 'bullets',
        date: new Date().toISOString().split('T')[0],
        summary: summary.summary,
        videoTitle,
      })
      setPdfDone(true)
      setTimeout(() => setPdfDone(false), 2000)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    } finally {
      setPdfLoading(false)
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
                TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePdfExport}
                disabled={pdfLoading}
              >
                {pdfDone ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : pdfLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {pdfDone ? 'Downloaded!' : 'PDF'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {summary && summary.success ? (
          <div className="max-w-none text-sm leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 space-y-3">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 space-y-3">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="pl-1">
                    {children}
                  </li>
                ),
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0">
                    {children}
                  </p>
                ),
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="min-w-full border-collapse border border-border text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border bg-muted px-3 py-1.5 text-left font-medium">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-1.5">
                    {children}
                  </td>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {summary.summary}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error || 'Failed to generate summary'}
              </p>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="mt-3"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

