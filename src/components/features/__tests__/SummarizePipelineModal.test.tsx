import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SummarizePipelineModal } from '../SummarizePipelineModal'
import { PipelineStep } from '@/types'

const makePendingSteps = (): PipelineStep[] => [
  { id: 1, label: 'Grabbing the conversation...', status: 'pending' },
  { id: 2, label: 'Processing transcript...', status: 'pending' },
  { id: 3, label: 'Setting up context...', status: 'pending' },
  { id: 4, label: 'Generating AI summary...', status: 'pending' },
  { id: 5, label: 'Finishing up...', status: 'pending' },
]

const defaultProps = {
  isOpen: true,
  steps: makePendingSteps(),
  currentStep: null as PipelineStep['id'] | null,
  onRetry: vi.fn(),
  onClose: vi.fn(),
}

describe('SummarizePipelineModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SummarizePipelineModal {...defaultProps} isOpen={false} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders all 5 step labels when open', () => {
    render(<SummarizePipelineModal {...defaultProps} />)

    expect(screen.getByText('Grabbing the conversation...')).toBeInTheDocument()
    expect(screen.getByText('Processing transcript...')).toBeInTheDocument()
    expect(screen.getByText('Setting up context...')).toBeInTheDocument()
    expect(screen.getByText('Generating AI summary...')).toBeInTheDocument()
    expect(screen.getByText('Finishing up...')).toBeInTheDocument()
  })

  it('shows "Fast-tracking your AI Summary" heading while running', () => {
    render(<SummarizePipelineModal {...defaultProps} currentStep={1} />)
    expect(screen.getByText('Fast-tracking your AI Summary')).toBeInTheDocument()
  })

  it('shows modal backdrop with correct accessibility attributes', () => {
    render(<SummarizePipelineModal {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Summarize pipeline progress')
  })

  it('shows "All done!" when all steps completed', () => {
    const completedSteps: PipelineStep[] = makePendingSteps().map((s) => ({
      ...s,
      status: 'completed' as const,
    }))
    render(
      <SummarizePipelineModal {...defaultProps} steps={completedSteps} currentStep={null} />
    )
    expect(screen.getByText('All done!')).toBeInTheDocument()
  })

  it('shows "Pipeline Error" heading when a step fails', () => {
    const steps = makePendingSteps()
    steps[0] = { ...steps[0], status: 'failed', error: 'No captions available' }
    render(<SummarizePipelineModal {...defaultProps} steps={steps} />)

    expect(screen.getByText('Pipeline Error')).toBeInTheDocument()
    expect(screen.getByText('No captions available')).toBeInTheDocument()
  })

  it('shows "Try Again" and "Close" buttons on first failure', () => {
    const steps = makePendingSteps()
    steps[0] = { ...steps[0], status: 'failed', error: 'Network error' }
    render(<SummarizePipelineModal {...defaultProps} steps={steps} />)

    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  it('calls onRetry when "Try Again" is clicked', () => {
    const onRetry = vi.fn()
    const steps = makePendingSteps()
    steps[0] = { ...steps[0], status: 'failed', error: 'Error' }
    render(<SummarizePipelineModal {...defaultProps} steps={steps} onRetry={onRetry} />)

    fireEvent.click(screen.getByText('Try Again'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when "Close" is clicked', () => {
    const onClose = vi.fn()
    const steps = makePendingSteps()
    steps[0] = { ...steps[0], status: 'failed', error: 'Error' }
    render(<SummarizePipelineModal {...defaultProps} steps={steps} onClose={onClose} />)

    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows only "Close" button on second failure (isSecondFailure prop)', () => {
    const steps = makePendingSteps()
    steps[0] = {
      ...steps[0],
      status: 'failed',
      error: 'Something went wrong. Please try again later.',
    }
    render(<SummarizePipelineModal {...defaultProps} steps={steps} isSecondFailure={true} />)

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  it('displays a fun fact while running (not completed, not failed)', () => {
    render(<SummarizePipelineModal {...defaultProps} currentStep={1} />)
    // Fun fact is rendered in an italic paragraph
    const funFactEl = document.querySelector('p.italic')
    expect(funFactEl).not.toBeNull()
    expect(funFactEl!.textContent!.length).toBeGreaterThan(10)
  })

  it('rotates fun facts every 5 seconds', () => {
    render(<SummarizePipelineModal {...defaultProps} currentStep={1} />)

    const funFactEl = document.querySelector('p.italic')!
    const firstFact = funFactEl.textContent

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    const secondFact = document.querySelector('p.italic')!.textContent
    // After rotation the fact should have changed (index 0 → index 1)
    expect(secondFact).not.toBe(firstFact)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    // No crash after another rotation
    expect(document.querySelector('p.italic')).not.toBeNull()
  })

  it('does not show fun fact when all steps completed', () => {
    const completedSteps = makePendingSteps().map((s) => ({
      ...s,
      status: 'completed' as const,
    }))
    render(
      <SummarizePipelineModal {...defaultProps} steps={completedSteps} currentStep={null} />
    )

    // Fun facts should not be in the document
    const italicElements = document.querySelectorAll('p.italic')
    expect(italicElements.length).toBe(0)
  })

  it('does not show fun fact when a step has failed', () => {
    const steps = makePendingSteps()
    steps[2] = { ...steps[2], status: 'failed', error: 'Oops' }
    render(<SummarizePipelineModal {...defaultProps} steps={steps} />)

    const italicElements = document.querySelectorAll('p.italic')
    expect(italicElements.length).toBe(0)
  })

  it('shows step 4 failure with no providers message', () => {
    const steps = makePendingSteps()
    steps[0] = { ...steps[0], status: 'completed' }
    steps[1] = { ...steps[1], status: 'completed' }
    steps[2] = { ...steps[2], status: 'completed' }
    steps[3] = {
      ...steps[3],
      status: 'failed',
      error: 'No AI providers configured. Add an API key in your .env.local file.',
    }
    render(<SummarizePipelineModal {...defaultProps} steps={steps} />)

    expect(
      screen.getByText('No AI providers configured. Add an API key in your .env.local file.')
    ).toBeInTheDocument()
  })

  it('shows step 1 failure with no captions message', () => {
    const steps = makePendingSteps()
    steps[0] = {
      ...steps[0],
      status: 'failed',
      error: "This video doesn't have captions available.",
    }
    render(<SummarizePipelineModal {...defaultProps} steps={steps} />)

    expect(
      screen.getByText("This video doesn't have captions available.")
    ).toBeInTheDocument()
  })

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const { unmount } = render(
      <SummarizePipelineModal {...defaultProps} currentStep={1} />
    )
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
