'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, XCircle, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProcessingStatusProps {
  state: 'idle' | 'processing' | 'completed' | 'error'
  progress?: number
  message?: string
  error?: string | null
  onCancel?: () => void
  className?: string
}

/**
 * Processing status component with progress indicator
 */
export function ProcessingStatus({
  state,
  progress = 0,
  message,
  error,
  onCancel,
  className,
}: ProcessingStatusProps) {
  if (state === 'idle') {
    return null
  }

  const getStatusIcon = () => {
    switch (state) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    if (error) return error
    if (message) return message
    
    switch (state) {
      case 'processing':
        return 'Processing transcript...'
      case 'completed':
        return 'Processing completed successfully'
      case 'error':
        return 'An error occurred during processing'
      default:
        return ''
    }
  }

  return (
    <Card className={cn(className)}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <span className="text-sm font-medium">{getStatusMessage()}</span>
            </div>
            {state === 'processing' && onCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-8 w-8"
                aria-label="Cancel processing"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {state === 'processing' && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {Math.round(progress)}%
              </p>
            </div>
          )}

          {state === 'error' && error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}





