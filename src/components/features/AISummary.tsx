'use client'

import { useState } from 'react'
import { ProcessedTranscript, SummaryStyle } from '@/types'
import { LLMProvider } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Info } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAISummary } from '@/hooks/useAISummary'
import { AISummaryCard } from './AISummaryCard'
import { transcriptToText, transcriptToTimestampedText, PROVIDER_LABELS, PROVIDER_SHORT_LABELS, getAllProviders } from '@/lib/ai-summary-utils'
import { cn } from '@/lib/utils'

/**
 * Props for AISummary component
 */
interface AISummaryProps {
  /** Processed transcript object (null if not available) */
  transcript: ProcessedTranscript | null
  /** Optional video title for download filenames */
  videoTitle?: string
  /** YouTube video URL for timestamp links in bullets style */
  videoUrl?: string
}

/**
 * AI Summary component for generating and displaying LLM summaries
 * 
 * Provides UI for:
 * - Selecting LLM provider (Anthropic, Gemini, Perplexity, or All)
 * - Generating summaries on-demand
 * - Displaying summaries with copy/download actions
 * - Handling loading and error states
 * 
 * @param props - Component props
 * @returns JSX element with provider selection, generation controls, and summary display
 * 
 * @remarks
 * - Shows empty state if transcript is not available
 * - Supports single provider or "all providers" mode
 * - Displays loading states per provider when generating
 * - Shows error messages for failed providers
 * - Allows copying and downloading individual summaries
 */
export function AISummary({ transcript, videoTitle, videoUrl }: AISummaryProps) {
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('anthropic')
  const [selectedStyle, setSelectedStyle] = useState<SummaryStyle>('bullets')
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null)
  
  const {
    hasGenerated,
    isLoading,
    generateSummary,
    reset,
    getSummaryForProvider,
    hasError,
    getError,
    isProviderLoading,
  } = useAISummary()

  // Check if transcript is available
  if (!transcript || transcript.segments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p>No transcript available. Please process a transcript first.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleGenerate = async () => {
    // Use timestamped text for bullets style, plain text for others
    const transcriptText = selectedStyle === 'bullets'
      ? transcriptToTimestampedText(transcript.segments)
      : transcriptToText(transcript)
    await generateSummary(transcriptText, selectedProvider, selectedStyle, videoUrl)
  }

  const handleCopy = (provider: string) => {
    setCopiedProvider(provider)
    setTimeout(() => setCopiedProvider(null), 2000)
  }

  const providerOptions: Array<{ value: LLMProvider; label: string }> = [
    { value: 'anthropic', label: PROVIDER_LABELS.anthropic },
    { value: 'google-gemini', label: PROVIDER_LABELS['google-gemini'] },
    { value: 'perplexity', label: PROVIDER_LABELS.perplexity },
    { value: 'all', label: PROVIDER_LABELS.all },
  ]

  const styleOptions: Array<{ value: SummaryStyle; label: string; description: string }> = [
    { value: 'bullets', label: 'Bullets', description: '10-15 key points covering the full episode with timestamp links' },
    { value: 'narrative', label: 'Narrative', description: 'Flowing prose paragraphs (750-1000 words)' },
    { value: 'technical', label: 'Technical', description: 'Tools, workflows, tips, and metrics (up to 2000 words)' },
  ]

  const providers = getAllProviders()

  return (
    <div className="space-y-6">
      {/* Provider Selection and Generate Button */}
      <Card>
        <CardHeader>
          <CardTitle>AI Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Select LLM Provider</Label>
            <RadioGroup
              value={selectedProvider}
              onValueChange={(value) => setSelectedProvider(value as LLMProvider)}
              disabled={isLoading}
              className="space-y-2"
            >
              {providerOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`provider-${option.value}`}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor={`provider-${option.value}`}
                    className={cn(
                      "font-normal cursor-pointer",
                      isLoading && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Summary Style</Label>
            <div className="flex gap-2">
              {styleOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStyle(option.value)}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedStyle === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background",
                    isLoading && "cursor-not-allowed opacity-50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {styleOptions.find(o => o.value === selectedStyle)?.description}
            </p>
            {selectedStyle === 'bullets' && videoUrl && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                <Info className="h-3 w-3" />
                <span>Includes video timestamp links</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Summary'
              )}
            </Button>
            
            {hasGenerated && (
              <Button
                onClick={reset}
                variant="outline"
                disabled={isLoading}
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading & Results — Tabbed for "All", single card otherwise */}
      {(isLoading || hasGenerated) && (
        <div className="space-y-4">
          {selectedProvider === 'all' ? (
            <Tabs defaultValue={providers[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {providers.map(provider => (
                  <TabsTrigger key={provider} value={provider} className="text-xs sm:text-sm">
                    {PROVIDER_SHORT_LABELS[provider]}
                    {isProviderLoading(provider) && (
                      <Loader2 className="ml-1.5 h-3 w-3 animate-spin" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {providers.map(provider => (
                <TabsContent key={provider} value={provider}>
                  {isProviderLoading(provider) ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="flex items-center justify-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Generating summary with {PROVIDER_LABELS[provider]}...
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <AISummaryCard
                      summary={getSummaryForProvider(provider)}
                      error={getError(provider)}
                      hasError={hasError(provider)}
                      providerLabel={PROVIDER_LABELS[provider]}
                      providerKey={provider}
                      videoTitle={videoTitle}
                      summaryStyle={selectedStyle}
                      copiedProvider={copiedProvider}
                      onCopy={handleCopy}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : isLoading ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Generating summary...
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            (() => {
              const summary = getSummaryForProvider(selectedProvider)
              const error = getError(selectedProvider)
              const hasErr = hasError(selectedProvider)

              if (!summary && !hasErr) {
                return (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <p>No summary generated yet. Click &quot;Generate Summary&quot; to create one.</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              }

              return (
                <AISummaryCard
                  summary={summary}
                  error={error}
                  hasError={hasErr}
                  providerLabel={PROVIDER_LABELS[selectedProvider]}
                  providerKey={selectedProvider}
                  videoTitle={videoTitle}
                  summaryStyle={selectedStyle}
                  copiedProvider={copiedProvider}
                  onCopy={handleCopy}
                />
              )
            })()
          )}
        </div>
      )}

      {/* Empty State */}
      {!hasGenerated && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Select a provider and click &quot;Generate Summary&quot; to create an AI-powered summary.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

