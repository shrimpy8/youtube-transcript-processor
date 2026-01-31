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

  it('renders all toggle switches after clicking Settings tab', async () => {
    const user = userEvent.setup()
    render(<ProcessingOptions />)

    await user.click(screen.getByRole('tab', { name: /settings/i }))

    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(4)
    expect(screen.getByText('Speaker Detection')).toBeInTheDocument()
    expect(screen.getByText('Deduplication')).toBeInTheDocument()
    expect(screen.getByText('Text Normalization')).toBeInTheDocument()
    expect(screen.getByText('Remove Timestamps')).toBeInTheDocument()
  })

  it('toggles speaker detection', async () => {
    const user = userEvent.setup()
    render(<ProcessingOptions />)

    await user.click(screen.getByRole('tab', { name: /settings/i }))

    const switches = screen.getAllByRole('switch')
    const speakerSwitch = switches[0]
    expect(speakerSwitch).toBeInTheDocument()

    await user.click(speakerSwitch)
    expect(speakerSwitch).toBeEnabled()
  })

  it('shows advanced settings when Advanced tab clicked', async () => {
    const user = userEvent.setup()
    render(<ProcessingOptions />)

    await user.click(screen.getByRole('tab', { name: /advanced/i }))

    expect(screen.getByLabelText(/max segment length/i)).toBeInTheDocument()
  })

  it('allows input of max segment length', async () => {
    const user = userEvent.setup()
    render(<ProcessingOptions />)

    await user.click(screen.getByRole('tab', { name: /advanced/i }))

    const input = screen.getByLabelText(/max segment length/i) as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('1000')

    expect(input).not.toBeDisabled()
    expect(input.type).toBe('number')
  })

  it('shows info icons that expand descriptions', async () => {
    const user = userEvent.setup()
    render(<ProcessingOptions />)

    await user.click(screen.getByRole('tab', { name: /settings/i }))

    const infoButtons = screen.getAllByRole('button', { name: /toggle.*description/i })
    expect(infoButtons.length).toBe(4)

    // Click first info button to expand description
    await user.click(infoButtons[0])
    expect(screen.getByText(/best for podcasts with multiple speakers/i)).toBeInTheDocument()
  })
})
