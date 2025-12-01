import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProcessingStatus } from '../ProcessingStatus'

describe('ProcessingStatus', () => {
  it('returns null when state is idle', () => {
    const { container } = render(<ProcessingStatus state="idle" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders processing state with progress', () => {
    render(<ProcessingStatus state="processing" progress={50} />)
    
    expect(screen.getByText(/processing transcript/i)).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders completed state', () => {
    render(<ProcessingStatus state="completed" />)
    
    expect(screen.getByText(/completed successfully/i)).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(<ProcessingStatus state="error" error="Test error" />)
    
    // Error appears in both status message and error box, so use getAllByText
    const errorTexts = screen.getAllByText('Test error')
    expect(errorTexts.length).toBeGreaterThan(0)
    expect(errorTexts[0]).toBeVisible()
  })

  it('shows cancel button when processing', () => {
    const handleCancel = vi.fn()
    render(<ProcessingStatus state="processing" onCancel={handleCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const handleCancel = vi.fn()
    const user = userEvent.setup()
    
    render(<ProcessingStatus state="processing" onCancel={handleCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('displays custom message', () => {
    render(<ProcessingStatus state="processing" message="Custom message" />)
    
    expect(screen.getByText('Custom message')).toBeInTheDocument()
  })

  it('shows progress bar when processing', () => {
    const { container } = render(<ProcessingStatus state="processing" progress={75} />)
    
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toBeInTheDocument()
  })
})

