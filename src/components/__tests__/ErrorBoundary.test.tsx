import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Suppress console.error for error boundary tests
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('catches React errors and displays error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText(/An unexpected error occurred/i)
    ).toBeInTheDocument()
  })

  it('displays error details when error is available', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const details = screen.getByText('Error details')
    expect(details).toBeInTheDocument()

    // Click to expand details
    fireEvent.click(details)
    expect(screen.getByText(/Test error/i)).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('uses custom fallback when provided', () => {
    const fallback = <div>Custom error fallback</div>
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('handles reset button click', () => {
    // Use a key to force remount after reset
    const { rerender } = render(
      <ErrorBoundary key="error">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    const resetButton = screen.getByText('Try again')
    expect(resetButton).toBeInTheDocument()
    
    // Click reset button - this resets the error boundary's internal state
    fireEvent.click(resetButton)

    // Re-render with a non-throwing component and new key to simulate recovery
    rerender(
      <ErrorBoundary key="recovered">
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    // After reset and re-render with non-throwing component, error should be gone
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('handles reload button click', () => {
    // Mock window.location.reload
    const originalReload = window.location.reload
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...window.location,
        reload: reloadSpy,
      },
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload page')
    fireEvent.click(reloadButton)

    expect(reloadSpy).toHaveBeenCalled()

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...window.location,
        reload: originalReload,
      },
    })
  })

  it('displays error stack trace when available', () => {
    const errorWithStack = new Error('Error with stack')
    errorWithStack.stack = 'Error: Error with stack\n    at test.js:1:1'

    const ThrowErrorWithStack = () => {
      throw errorWithStack
    }

    render(
      <ErrorBoundary>
        <ThrowErrorWithStack />
      </ErrorBoundary>
    )

    const details = screen.getByText('Error details')
    fireEvent.click(details)

    expect(screen.getByText(/Error with stack/i)).toBeInTheDocument()
  })
})

