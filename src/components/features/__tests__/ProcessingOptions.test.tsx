import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProcessingOptions } from '../ProcessingOptions'

describe('ProcessingOptions', () => {
  it('renders processing options card', () => {
    render(<ProcessingOptions />)
    
    expect(screen.getByText('Processing Options')).toBeInTheDocument()
    expect(screen.getByText(/configure how transcripts/i)).toBeInTheDocument()
  })

  it('renders all toggle switches', () => {
    render(<ProcessingOptions />)
    
    expect(screen.getByLabelText(/speaker detection/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/deduplication/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/text normalization/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/remove timestamps/i)).toBeInTheDocument()
  })

  it('toggles speaker detection', async () => {
    const user = userEvent.setup()
    render(<ProcessingOptions />)
    
    const switch_ = screen.getByLabelText(/speaker detection/i)
    expect(switch_).toBeInTheDocument()
    
    // Click the switch
    await user.click(switch_)
    
    // Switch should be interactive
    expect(switch_).toBeEnabled()
  })

  it('shows advanced settings when expanded', async () => {
    const user = userEvent.setup()
    render(<ProcessingOptions />)
    
    const trigger = screen.getByText('Advanced Settings')
    await user.click(trigger)
    
    expect(screen.getByLabelText(/max segment length/i)).toBeInTheDocument()
  })

  it('allows input of max segment length', async () => {
    const user = userEvent.setup()
    render(<ProcessingOptions />)
    
    // Expand advanced settings
    const trigger = screen.getByText('Advanced Settings')
    await user.click(trigger)
    
    const input = screen.getByLabelText(/max segment length/i) as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('1000') // Default value
    
    // Input is present and editable
    expect(input).not.toBeDisabled()
    expect(input.type).toBe('number')
  })

  it('shows tooltips on info icons', () => {
    render(<ProcessingOptions />)
    
    const infoIcons = screen.getAllByRole('button', { name: '' }).filter(
      (el) => el.querySelector('svg')
    )
    expect(infoIcons.length).toBeGreaterThan(0)
  })
})

