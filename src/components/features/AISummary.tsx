'use client'

import { useState } from 'react'
import { ProcessedTranscript, SummaryStyle } from '@/types'
import { LLMProvider } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Info, Bot, Sparkles, Globe, Layers, AlertTriangle, KeyRound, XCircle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAISummary, useProviderConfig } from '@/hooks/useAISummary'
import { AISummaryCard } from './AISummaryCard'
import { transcriptToText, transcriptToTimestampedText, PROVIDER_LABELS, PROVIDER_SHORT_LABELS, getAllProviders } from '@/lib/ai-summary-utils'
import { cn } from '@/lib/utils'
import type { LLMProviderKey } from '@/lib/llm-config'

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

  const {
    isProviderConfigured,
    configuredProviders,
    noKeysConfigured,
    anyKeyConfigured,
  } = useProviderConfig()

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

  // Determine if selected provider is configured
  const selectedIsConfigured = selectedProvider === 'all'
    ? anyKeyConfigured
    : isProviderConfigured(selectedProvider as LLMProviderKey)

  const canGenerate = !isLoading && selectedIsConfigured

  const handleGenerate = async () => {
    if (!selectedIsConfigured) return
    const transcriptText = selectedStyle === 'bullets'
      ? transcriptToTimestampedText(transcript.segments)
      : transcriptToText(transcript)
    await generateSummary(transcriptText, selectedProvider, selectedStyle, videoUrl, configuredProviders)
  }

  const handleCopy = (provider: string) => {
    setCopiedProvider(provider)
    setTimeout(() => setCopiedProvider(null), 2000)
  }

  const providerOptions: Array<{ value: LLMProvider; labelLine1: string; labelLine2: string; icon: typeof Bot; color: string; borderColor: string }> = [
    { value: 'anthropic', labelLine1: 'Anthropic', labelLine2: 'Sonnet 4.5', icon: Bot, color: 'text-amber-600 dark:text-amber-400', borderColor: 'border-l-amber-500' },
    { value: 'google-gemini', labelLine1: 'Google', labelLine2: 'Gemini 2.5 Flash', icon: Sparkles, color: 'text-blue-600 dark:text-blue-400', borderColor: 'border-l-blue-500' },
    { value: 'perplexity', labelLine1: 'Perplexity', labelLine2: 'Sonar Online', icon: Globe, color: 'text-green-600 dark:text-green-400', borderColor: 'border-l-green-500' },
    { value: 'all', labelLine1: 'All', labelLine2: 'LLMs', icon: Layers, color: 'text-purple-600 dark:text-purple-400', borderColor: 'border-l-purple-500' },
  ]

  const styleOptions: Array<{ value: SummaryStyle; label: string; description: string }> = [
    { value: 'bullets', label: 'Bullets', description: '10-15 key points covering the full episode with timestamp links' },
    { value: 'narrative', label: 'Narrative', description: 'Flowing prose paragraphs (750-1000 words)' },
    { value: 'technical', label: 'Technical', description: 'Tools, workflows, tips, and metrics (up to 2000 words)' },
  ]

  const providers = getAllProviders()

  // Helper to get a friendly name for the selected provider in warnings
  const selectedProviderLabel = selectedProvider === 'all'
    ? 'All LLMs'
    : PROVIDER_LABELS[selectedProvider as LLMProviderKey]

  return (
    <div className="space-y-6">
      {/* Provider Selection and Generate Button */}
      <Card>
        <CardHeader>
          <CardTitle>AI Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Banner: No API keys configured */}
          {noKeysConfigured && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-3 text-sm">
              <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">No LLM API keys configured</p>
                <p className="text-amber-700 dark:text-amber-400/80 text-xs mt-0.5">
                  Add at least one API key to <code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5">.env.local</code> to enable AI summaries.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>Select Commercial LLM</Label>
            <RadioGroup
              value={selectedProvider}
              onValueChange={(value) => setSelectedProvider(value as LLMProvider)}
              disabled={isLoading}
              className="grid grid-cols-4 gap-2"
            >
              {providerOptions.map(option => {
                const Icon = option.icon
                const isSelected = selectedProvider === option.value
                // For individual providers, check config directly. "All" is unconfigured only if none are.
                const isUnconfigured = option.value === 'all'
                  ? !anyKeyConfigured
                  : !isProviderConfigured(option.value as LLMProviderKey)
                return (
                  <Label
                    key={option.value}
                    htmlFor={`provider-${option.value}`}
                    className={cn(
                      "relative flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 cursor-pointer transition-all text-center",
                      isSelected
                        ? `border-t-4 ${option.borderColor.replace('border-l-', 'border-t-')} bg-background shadow-sm ring-1 ring-accent`
                        : "border-t-4 border-t-transparent bg-muted/50 shadow-inner opacity-75 hover:opacity-100 hover:bg-muted/80",
                      isLoading && "cursor-not-allowed !opacity-50",
                      isUnconfigured && !isSelected && "!opacity-40"
                    )}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`provider-${option.value}`}
                      disabled={isLoading}
                      className="sr-only"
                    />
                    {/* Red X badge for unconfigured provider */}
                    {isUnconfigured && (
                      <span className="absolute -top-1.5 -right-1.5 rounded-full bg-background" title="API key not configured">
                        <XCircle className="h-4 w-4 text-red-500" />
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", option.color)} />
                      <span className="text-xs font-semibold leading-tight">{option.labelLine1}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{option.labelLine2}</span>
                  </Label>
                )
              })}
            </RadioGroup>
            {/* Annotation explaining the red X badge */}
            {providers.some(p => !isProviderConfigured(p)) && (
              <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                <span>= API key not configured</span>
              </p>
            )}
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

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
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
                  onClick={() => {
                    if (window.confirm('Clear all generated summaries?')) {
                      reset()
                    }
                  }}
                  variant="outline"
                  disabled={isLoading}
                >
                  Reset
                </Button>
              )}
            </div>

            {/* Inline warning when unconfigured provider is selected */}
            {!selectedIsConfigured && !isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                <span>{selectedProviderLabel} API key is not configured in .env.local</span>
              </div>
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
                {providers.map(provider => {
                  const opt = providerOptions.find(o => o.value === provider)
                  const ProvIcon = opt?.icon
                  const tabUnconfigured = !isProviderConfigured(provider)
                  return (
                    <TabsTrigger
                      key={provider}
                      value={provider}
                      className={cn(
                        "text-xs sm:text-sm",
                        tabUnconfigured && "opacity-60"
                      )}
                    >
                      {ProvIcon && <ProvIcon className={cn("h-3.5 w-3.5", opt?.color)} />}
                      {PROVIDER_SHORT_LABELS[provider]}
                      {tabUnconfigured && (
                        <span className="ml-1" title="API key not configured">
                          <XCircle className="h-3 w-3 text-red-500" />
                        </span>
                      )}
                      {isProviderLoading(provider) && (
                        <Loader2 className="ml-1.5 h-3 w-3 animate-spin" />
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              {providers.map(provider => {
                const tabUnconfigured = !isProviderConfigured(provider)
                return (
                  <TabsContent key={provider} value={provider}>
                    {tabUnconfigured && !isProviderLoading(provider) && !getSummaryForProvider(provider) && !hasError(provider) ? (
                      <Card>
                        <CardContent className="py-12">
                          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                            <XCircle className="h-5 w-5 text-red-500" />
                            <p className="text-sm">
                              {PROVIDER_LABELS[provider]} API key is not configured.
                            </p>
                            <p className="text-xs">
                              Add the key to <code className="rounded bg-muted px-1 py-0.5">.env.local</code> to enable this provider.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : isProviderLoading(provider) ? (
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
                        onRetry={handleGenerate}
                      />
                    )}
                  </TabsContent>
                )
              })}
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
                  onRetry={handleGenerate}
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
