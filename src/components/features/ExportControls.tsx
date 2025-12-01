'use client'

import { useState } from 'react'
import { ProcessedTranscript } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Download, Loader2, Check } from 'lucide-react'
import { exportAndDownload } from '@/lib/export-utils'

interface ExportControlsProps {
  transcript: ProcessedTranscript
  videoTitle?: string
  className?: string
}

/**
 * Export controls component for downloading transcripts
 */
export function ExportControls({ 
  transcript, 
  videoTitle,
  className 
}: ExportControlsProps) {
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeTimestamps, setIncludeTimestamps] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    setExportSuccess(false)

    try {
      await exportAndDownload(
        transcript,
        'txt',
        {
          includeMetadata,
          includeTimestamps,
        },
        videoTitle
      )
      setExportSuccess(true)
      // Reset success message after 2 seconds
      setTimeout(() => setExportSuccess(false), 2000)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Export Transcript</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="metadata-toggle" className="cursor-pointer">
            Include Metadata
          </Label>
          <Switch
            id="metadata-toggle"
            checked={includeMetadata}
            onCheckedChange={setIncludeMetadata}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="timestamps-toggle" className="cursor-pointer">
            Include Timestamps
          </Label>
          <Switch
            id="timestamps-toggle"
            checked={includeTimestamps}
            onCheckedChange={setIncludeTimestamps}
          />
        </div>

        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : exportSuccess ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Exported!
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download TXT
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
