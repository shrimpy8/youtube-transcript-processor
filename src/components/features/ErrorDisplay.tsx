'use client'

import { Info, XCircle, WifiOff, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorType } from '@/lib/errors'
import { cn } from '@/lib/utils'

export interface ErrorDisplayProps {
  error: string | Error | null
  errorType?: ErrorType | string
  suggestion?: string | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  variant?: 'default' | 'inline' | 'compact'
}

/**
 * Error display component with user-friendly messages and retry functionality
 */
export function ErrorDisplay({
  error,
  errorType,
  suggestion,
  onRetry,
  onDismiss,
  className,
  variant = 'default',
}: ErrorDisplayProps) {
  if (!error) return null

  const errorMessage = error instanceof Error ? error.message : error

  // Determine icon and styling based on error type
  const getErrorConfig = () => {
    switch (errorType) {
      case ErrorType.NETWORK_ERROR:
        return {
          icon: WifiOff,
          iconColor: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-950/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
        }
      case ErrorType.RATE_LIMIT:
        return {
          icon: Clock,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
        }
      case ErrorType.NO_TRANSCRIPT:
      case ErrorType.VIDEO_NOT_FOUND:
        return {
          icon: Info,
          iconColor: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
        }
      default:
        return {
          icon: XCircle,
          iconColor: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive',
        }
    }
  }

  const config = getErrorConfig()
  const Icon = config.icon

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-start gap-2 text-sm', className)}>
        <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium', config.iconColor)}>{errorMessage}</p>
          {suggestion && (
            <p className="text-xs text-muted-foreground mt-1">{suggestion}</p>
          )}
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="mt-2 h-7 text-xs"
            >
              Retry
            </Button>
          )}
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 w-7 p-0"
          >
            <XCircle className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('p-3 rounded-lg border', config.bgColor, config.borderColor, className)}>
        <div className="flex items-start gap-2">
          <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.iconColor)} />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', config.iconColor)}>{errorMessage}</p>
            {suggestion && (
              <p className="text-xs text-muted-foreground mt-1">{suggestion}</p>
            )}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
            >
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2 h-7 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <Card className={cn('border', config.borderColor, className)}>
      <CardContent className={cn('p-4', config.bgColor)}>
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconColor)} />
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium mb-1', config.iconColor)}>{errorMessage}</p>
            {suggestion && (
              <p className="text-sm text-muted-foreground mb-3">{suggestion}</p>
            )}
            {onRetry && (
              <Button
                variant="default"
                size="sm"
                onClick={onRetry}
                className="h-8"
              >
                Try again
              </Button>
            )}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

