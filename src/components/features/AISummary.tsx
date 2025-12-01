'use client'

import { useState } from 'react'
import { ProcessedTranscript } from '@/types'
import { LLMProvider } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'
import { useAISummary } from '@/hooks/useAISummary'
import { AISummaryCard } from './AISummaryCard'
import { transcriptToText, PROVIDER_LABELS, getAllProviders } from '@/lib/ai-summary-utils'
import { cn } from '@/lib/utils'

/**
 * Props for AISummary component
 */
interface AISummaryProps {
  /** Processed transcript object (null if not available) */
  transcript: ProcessedTranscript | null
  /** Optional video title for download filenames */
  videoTitle?: string
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
export function AISummary({ transcript, videoTitle }: AISummaryProps) {
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('anthropic')
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null)
  
  const {
    summaries,
    loading,
    errors,
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
    const transcriptText = transcriptToText(transcript)
    await generateSummary(transcriptText, selectedProvider)
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

      {/* Loading States */}
      {isLoading && (
        <div className="space-y-4">
          {selectedProvider === 'all' ? (
            providers.map(provider => (
              isProviderLoading(provider) && (
                <Card key={provider}>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Generating summary with {providerOptions.find(o => o.value === provider)?.label}...
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            ))
          ) : (
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
          )}
        </div>
      )}

      {/* Summary Results */}
      {hasGenerated && !isLoading && (
        <div className="space-y-4">
          {selectedProvider === 'all' ? (
            // Show all summaries
            providers.map(provider => (
              <AISummaryCard
                key={provider}
                summary={getSummaryForProvider(provider)}
                error={getError(provider)}
                hasError={hasError(provider)}
                providerLabel={PROVIDER_LABELS[provider]}
                providerKey={provider}
                videoTitle={videoTitle}
                copiedProvider={copiedProvider}
                onCopy={handleCopy}
              />
            ))
          ) : (
            // Show single summary
            (() => {
              const summary = getSummaryForProvider(selectedProvider)
              const error = getError(selectedProvider)
              const hasErr = hasError(selectedProvider)
              
              if (!summary && !hasErr) {
                return (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <p>No summary generated yet. Click "Generate Summary" to create one.</p>
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
              <p>Select a provider and click "Generate Summary" to create an AI-powered summary.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

