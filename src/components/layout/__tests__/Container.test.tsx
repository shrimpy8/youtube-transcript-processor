import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Container } from '../Container'

describe('Container', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Container>
        <div>Test Content</div>
      </Container>
    )
    
    expect(getByText('Test Content')).toBeInTheDocument()
  })

  it('applies default max-width class', () => {
    const { container } = render(
      <Container>
        <div>Test</div>
      </Container>
    )
    
    const containerElement = container.firstChild as HTMLElement
    expect(containerElement).toHaveClass('max-w-screen-xl')
  })

  it('applies custom max-width class', () => {
    const { container } = render(
      <Container maxWidth="lg">
        <div>Test</div>
      </Container>
    )
    
    const containerElement = container.firstChild as HTMLElement
    expect(containerElement).toHaveClass('max-w-screen-lg')
  })

  it('applies custom className', () => {
    const { container } = render(
      <Container className="custom-class">
        <div>Test</div>
      </Container>
    )
    
    const containerElement = container.firstChild as HTMLElement
    expect(containerElement).toHaveClass('custom-class')
  })

  it('has proper spacing classes', () => {
    const { container } = render(
      <Container>
        <div>Test</div>
      </Container>
    )
    
    const containerElement = container.firstChild as HTMLElement
    expect(containerElement).toHaveClass('px-4', 'sm:px-6', 'lg:px-8')
  })
})





