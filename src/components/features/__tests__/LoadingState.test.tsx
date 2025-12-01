import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingState } from '../LoadingState'

describe('LoadingState', () => {
  it('renders with default message', () => {
    render(<LoadingState />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<LoadingState message="Fetching transcript..." />)
    
    expect(screen.getByText('Fetching transcript...')).toBeInTheDocument()
  })

  it('renders loader icon', () => {
    const { container } = render(<LoadingState />)
    
    const loader = container.querySelector('.animate-spin')
    expect(loader).toBeInTheDocument()
  })

  it('applies size classes correctly', () => {
    const { container: smContainer } = render(<LoadingState size="sm" />)
    const { container: lgContainer } = render(<LoadingState size="lg" />)
    
    expect(smContainer.querySelector('.h-4')).toBeInTheDocument()
    expect(lgContainer.querySelector('.h-8')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingState className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})





