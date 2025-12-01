'use client'

import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface RetryButtonProps {
  onRetry: () => void | Promise<void>
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  children?: React.ReactNode
}

/**
 * Retry button component with loading state
 */
export function RetryButton({
  onRetry,
  disabled = false,
  variant = 'default',
  size = 'default',
  className,
  children = 'Retry',
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (disabled || isRetrying) return

    setIsRetrying(true)
    try {
      await onRetry()
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <Button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      variant={variant}
      size={size}
      className={cn('flex items-center gap-2', className)}
    >
      <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
      {isRetrying ? 'Retrying...' : children}
    </Button>
  )
}

