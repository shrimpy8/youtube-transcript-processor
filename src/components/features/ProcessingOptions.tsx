'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Settings, SlidersHorizontal, Info } from 'lucide-react'
import { useProcessingOptions } from '@/hooks/useProcessingOptions'
import { UrlInput } from '@/components/features/UrlInput'

interface UrlDetectionInfo {
  type: 'channel' | 'playlist'
  name: string
  url: string
}

interface ProcessingOptionsProps {
  onSubmit?: (url: string) => void
  detectionMessage?: UrlDetectionInfo | null
  onCopyUrl?: (url: string) => void
  externalUrl?: string | null
  onExternalUrlCleared?: () => void
  onClearDetectionMessage?: () => void
}

interface ToggleOption {
  id: string
  key: 'speakerDetection' | 'deduplication' | 'normalizeText' | 'removeTimestamps'
  label: string
  tooltip: string
  description: string
}

const TOGGLE_OPTIONS: ToggleOption[] = [
  {
    id: 'speaker-detection',
    key: 'speakerDetection',
    label: 'Speaker Detection',
    tooltip: 'Automatically identify Host and Guest speakers',
    description: 'Best for podcasts with multiple speakers. Automatically identifies and labels Host and Guest speakers. Turn off for single-speaker videos or when speaker labels aren\u2019t needed.',
  },
  {
    id: 'deduplication',
    key: 'deduplication',
    label: 'Deduplication',
    tooltip: 'Remove repeated phrases and duplicate content',
    description: 'Removes filler words, repeated phrases, and duplicate content to create cleaner transcripts. Use with caution as it may remove intentionally repeated important information.',
  },
  {
    id: 'normalize-text',
    key: 'normalizeText',
    label: 'Text Normalization',
    tooltip: 'Clean and normalize transcript text',
    description: 'Cleans formatting, fixes capitalization, and standardizes punctuation for better readability. Recommended for most use cases to ensure consistent, professional-looking transcripts.',
  },
  {
    id: 'remove-timestamps',
    key: 'removeTimestamps',
    label: 'Remove Timestamps',
    tooltip: 'Remove timestamp information from transcript',
    description: 'Removes timestamp markers from the transcript for cleaner text output. Keep timestamps if you need to reference specific moments in the video or create time-coded transcripts.',
  },
]

/**
 * Processing options panel component
 */
export function ProcessingOptions({ onSubmit, detectionMessage, onCopyUrl, externalUrl, onExternalUrlCleared, onClearDetectionMessage }: ProcessingOptionsProps) {
  const { options, updateOption } = useProcessingOptions()
  const [activeTab, setActiveTab] = useState('')
  const [expandedToggles, setExpandedToggles] = useState<Set<string>>(new Set())
  const [localSegmentLength, setLocalSegmentLength] = useState(String(options.maxSegmentLength))

  const toggleDescription = useCallback((id: string) => {
    setExpandedToggles(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSegmentLengthBlur = () => {
    const parsed = parseInt(localSegmentLength, 10)
    if (isNaN(parsed) || localSegmentLength.trim() === '') {
      setLocalSegmentLength('1000')
      updateOption('maxSegmentLength', 1000)
      return
    }
    const clamped = Math.min(5000, Math.max(100, parsed))
    setLocalSegmentLength(String(clamped))
    updateOption('maxSegmentLength', clamped)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Options</CardTitle>
        <CardDescription>
          Enter a YouTube URL and configure how transcripts are processed and formatted
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input */}
        {onSubmit && (
          <div className="pb-4 border-b">
            <UrlInput
              onSubmit={onSubmit}
              className="w-full"
              detectionMessage={detectionMessage}
              onCopyUrl={onCopyUrl}
              externalUrl={externalUrl}
              onExternalUrlCleared={onExternalUrlCleared}
              onClearDetectionMessage={onClearDetectionMessage}
            />
          </div>
        )}

        {/* Tabbed Settings */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <SlidersHorizontal className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-3 pt-2">
            {TOGGLE_OPTIONS.map(opt => (
              <div key={opt.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={opt.id} className="cursor-pointer">
                      {opt.label}
                    </Label>
                    <button
                      type="button"
                      onClick={() => toggleDescription(opt.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Toggle ${opt.label} description`}
                      title={opt.tooltip}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  <Switch
                    id={opt.id}
                    checked={options[opt.key] as boolean}
                    onCheckedChange={(checked) => updateOption(opt.key, checked)}
                  />
                </div>
                {expandedToggles.has(opt.id) && (
                  <p className="text-sm text-muted-foreground pl-0">
                    {opt.description}
                  </p>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="max-segment-length">Max Segment Length</Label>
              </div>
              <Input
                id="max-segment-length"
                type="number"
                min="100"
                max="5000"
                value={localSegmentLength}
                onChange={(e) => setLocalSegmentLength(e.target.value)}
                onBlur={handleSegmentLengthBlur}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground pl-0">
                Controls the maximum length of each transcript segment (100–5000 characters).
                Default is 1000. Shorter segments improve readability; longer segments maintain context.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
