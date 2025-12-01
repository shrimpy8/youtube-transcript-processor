'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useProcessingOptions } from '@/hooks/useProcessingOptions'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

/**
 * Processing options panel component
 */
export function ProcessingOptions({ onSubmit, detectionMessage, onCopyUrl, externalUrl, onExternalUrlCleared, onClearDetectionMessage }: ProcessingOptionsProps) {
  const { options, updateOption } = useProcessingOptions()
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Options</CardTitle>
        <CardDescription>
          Enter a YouTube URL and configure how transcripts are processed and formatted
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <div className="space-y-4">
          {/* Speaker Detection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="speaker-detection" className="cursor-pointer">
                  Speaker Detection
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Automatically identify Host and Guest speakers</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="speaker-detection"
                checked={options.speakerDetection}
                onCheckedChange={(checked) => updateOption('speakerDetection', checked)}
              />
            </div>
            <p className="text-sm text-muted-foreground pl-0">
              Best for podcasts with multiple speakers. Automatically identifies and labels Host and Guest speakers. 
              Turn off for single-speaker videos or when speaker labels aren&apos;t needed.
            </p>
          </div>

          {/* Deduplication */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="deduplication" className="cursor-pointer">
                  Deduplication
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove repeated phrases and duplicate content</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="deduplication"
                checked={options.deduplication}
                onCheckedChange={(checked) => updateOption('deduplication', checked)}
              />
            </div>
            <p className="text-sm text-muted-foreground pl-0">
              Removes filler words, repeated phrases, and duplicate content to create cleaner transcripts. 
              Use with caution as it may remove intentionally repeated important information.
            </p>
          </div>

          {/* Text Normalization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="normalize-text" className="cursor-pointer">
                  Text Normalization
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clean and normalize transcript text</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="normalize-text"
                checked={options.normalizeText}
                onCheckedChange={(checked) => updateOption('normalizeText', checked)}
              />
            </div>
            <p className="text-sm text-muted-foreground pl-0">
              Cleans formatting, fixes capitalization, and standardizes punctuation for better readability. 
              Recommended for most use cases to ensure consistent, professional-looking transcripts.
            </p>
          </div>

          {/* Remove Timestamps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="remove-timestamps" className="cursor-pointer">
                  Remove Timestamps
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove timestamp information from transcript</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="remove-timestamps"
                checked={options.removeTimestamps}
                onCheckedChange={(checked) => updateOption('removeTimestamps', checked)}
              />
            </div>
            <p className="text-sm text-muted-foreground pl-0">
              Removes timestamp markers from the transcript for cleaner text output. 
              Keep timestamps if you need to reference specific moments in the video or create time-coded transcripts.
            </p>
          </div>
        </div>

        {/* Advanced Settings */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium">
            <span>Advanced Settings</span>
            {isAdvancedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="max-segment-length">Max Segment Length</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Maximum characters per segment (default: 1000)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="max-segment-length"
                type="number"
                min="100"
                max="5000"
                value={options.maxSegmentLength}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (!isNaN(value) && value >= 100 && value <= 5000) {
                    updateOption('maxSegmentLength', value)
                  }
                }}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground pl-0">
                Controls the maximum length of each transcript segment. Shorter segments improve readability 
                but may break up longer thoughts. Longer segments maintain context but can be harder to scan. 
                Default (1000 characters) works well for most cases.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

