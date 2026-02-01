'use client'

import { useEffect, useState, useRef } from 'react'
import { PipelineStep, PipelineStepId } from '@/types'
import { Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react'

const FUN_FACTS = [
  'The average podcast episode has about 8,000 words.',
  'AI can summarize a 1-hour podcast in under 30 seconds.',
  'Podcast listenership has doubled in the last 5 years.',
  'The first podcast was published in 2004.',
  'Over 4 million podcasts exist worldwide.',
  'Most podcast listeners subscribe to 7 shows on average.',
]

interface SummarizePipelineModalProps {
  isOpen: boolean
  steps: PipelineStep[]
  currentStep: PipelineStepId | null
  onRetry: () => void
  onClose: () => void
  funFact?: string
  isSecondFailure?: boolean
}

export function SummarizePipelineModal({
  isOpen,
  steps,
  onRetry,
  onClose,
  isSecondFailure: isSecondFailureProp = false,
}: SummarizePipelineModalProps) {
  const [funFact, setFunFact] = useState(FUN_FACTS[0])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rotate fun facts every 5 seconds
  useEffect(() => {
    if (!isOpen) return
    let idx = 0
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % FUN_FACTS.length
      setFunFact(FUN_FACTS[idx])
    }, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isOpen])

  if (!isOpen) return null

  const allCompleted = steps.every((s) => s.status === 'completed')
  const hasFailed = steps.some((s) => s.status === 'failed')

  const isSecondFailure = hasFailed && isSecondFailureProp

  const getStepIcon = (step: PipelineStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive shrink-0" />
      case 'pending':
      default:
        return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Summarize pipeline progress"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          {!allCompleted && !hasFailed && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
          <h2 className="text-lg font-semibold">
            {allCompleted
              ? 'All done!'
              : hasFailed
              ? 'Pipeline Error'
              : 'Fast-tracking your AI Summary'}
          </h2>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="mt-0.5">{getStepIcon(step)}</div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    step.status === 'completed'
                      ? 'text-foreground'
                      : step.status === 'in_progress'
                      ? 'text-foreground font-medium'
                      : step.status === 'failed'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </p>
                {step.status === 'failed' && step.error && (
                  <p className="text-xs text-destructive mt-0.5">{step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {hasFailed && (
          <div className="flex justify-center gap-2">
            {isSecondFailure ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        )}

        {/* Fun fact */}
        {!allCompleted && !hasFailed && (
          <p className="text-xs text-muted-foreground text-center italic">
            {funFact}
          </p>
        )}
      </div>
    </div>
  )
}
