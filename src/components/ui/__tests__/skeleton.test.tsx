import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from '../skeleton'

describe('Skeleton', () => {
  it('renders skeleton element', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toBeInTheDocument()
  })

  it('applies default variant classes', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('rounded-md')
  })

  it('applies circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('rounded-full')
  })

  it('applies text variant', () => {
    const { container } = render(<Skeleton variant="text" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('rounded')
  })

  it('applies rectangular variant', () => {
    const { container } = render(<Skeleton variant="rectangular" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('rounded-none')
  })

  it('applies animation by default', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('disables animation when animate is false', () => {
    const { container } = render(<Skeleton animate={false} />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).not.toHaveClass('animate-pulse')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('custom-class')
  })

  it('has accessibility attributes', () => {
    render(<Skeleton />)
    const skeleton = screen.getByRole('status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading')
  })

  it('forwards other props', () => {
    const { container } = render(<Skeleton data-testid="skeleton" />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveAttribute('data-testid', 'skeleton')
  })
})

