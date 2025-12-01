import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorDisplay } from '../ErrorDisplay'
import { ErrorType } from '@/lib/errors'

describe('ErrorDisplay', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(<ErrorDisplay error={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders error message from string', () => {
    render(<ErrorDisplay error="Test error message" />)
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('renders error message from Error object', () => {
    const error = new Error('Error object message')
    render(<ErrorDisplay error={error} />)
    expect(screen.getByText('Error object message')).toBeInTheDocument()
  })

  it('displays suggestion when provided', () => {
    render(
      <ErrorDisplay
        error="Test error"
        suggestion="Try again later"
      />
    )
    expect(screen.getByText('Try again later')).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    render(
      <ErrorDisplay
        error="Test error"
        onRetry={onRetry}
      />
    )

    const retryButton = screen.getByText('Try again')
    fireEvent.click(retryButton)

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(
      <ErrorDisplay
        error="Test error"
        onDismiss={onDismiss}
      />
    )

    const dismissButton = screen.getByRole('button', { name: '' })
    fireEvent.click(dismissButton)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  describe('error type styling', () => {
    it('applies network error styling', () => {
      const { container } = render(
        <ErrorDisplay
          error="Network error"
          errorType={ErrorType.NETWORK_ERROR}
        />
      )

      expect(container.querySelector('.text-orange-600')).toBeInTheDocument()
    })

    it('applies rate limit styling', () => {
      const { container } = render(
        <ErrorDisplay
          error="Rate limit error"
          errorType={ErrorType.RATE_LIMIT}
        />
      )

      expect(container.querySelector('.text-yellow-600')).toBeInTheDocument()
    })

    it('applies no transcript styling', () => {
      const { container } = render(
        <ErrorDisplay
          error="No transcript"
          errorType={ErrorType.NO_TRANSCRIPT}
        />
      )

      expect(container.querySelector('.text-blue-600')).toBeInTheDocument()
    })

    it('applies default error styling', () => {
      const { container } = render(
        <ErrorDisplay error="Unknown error" />
      )

      expect(container.querySelector('.text-destructive')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('renders inline variant', () => {
      render(
        <ErrorDisplay
          error="Inline error"
          variant="inline"
        />
      )

      expect(screen.getByText('Inline error')).toBeInTheDocument()
    })

    it('renders compact variant', () => {
      render(
        <ErrorDisplay
          error="Compact error"
          variant="compact"
        />
      )

      expect(screen.getByText('Compact error')).toBeInTheDocument()
    })

    it('renders default variant', () => {
      render(
        <ErrorDisplay
          error="Default error"
          variant="default"
        />
      )

      expect(screen.getByText('Default error')).toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    const { container } = render(
      <ErrorDisplay
        error="Test error"
        className="custom-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('does not show retry button when onRetry is not provided', () => {
    render(<ErrorDisplay error="Test error" />)
    expect(screen.queryByText('Try again')).not.toBeInTheDocument()
  })

  it('does not show dismiss button when onDismiss is not provided', () => {
    render(<ErrorDisplay error="Test error" />)
    const buttons = screen.queryAllByRole('button')
    expect(buttons.length).toBe(0)
  })
})

