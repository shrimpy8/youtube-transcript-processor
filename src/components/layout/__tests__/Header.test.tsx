import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '../Header'

describe('Header', () => {
  it('renders header with logo', () => {
    render(<Header />)
    
    const logo = screen.getByText('YouTube Podcast Transcript Processor')
    expect(logo).toBeInTheDocument()
  })

  it('renders theme toggle', () => {
    render(<Header />)
    
    const themeToggle = screen.getByRole('button', { name: /toggle theme|switch to/i })
    expect(themeToggle).toBeInTheDocument()
  })

  it('has proper semantic HTML structure', () => {
    const { container } = render(<Header />)
    
    const header = container.querySelector('header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('sticky', 'top-0')
  })

  it('has accessible navigation', () => {
    render(<Header />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
  })
})





