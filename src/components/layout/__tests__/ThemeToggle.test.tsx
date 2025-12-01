import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '../ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset document classes
    document.documentElement.classList.remove('dark')
  })

  it('renders theme toggle button', async () => {
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /toggle theme|switch to/i })
      expect(button).toBeInTheDocument()
    })
  })

  it('toggles theme from light to dark', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    const button = screen.getByRole('button')
    await user.click(button)

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(localStorage.getItem('theme')).toBe('dark')
    })
  })

  it('toggles theme from dark to light', async () => {
    const user = userEvent.setup()
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.add('dark')
    
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    const button = screen.getByRole('button')
    await user.click(button)

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(localStorage.getItem('theme')).toBe('light')
    })
  })

  it('persists theme preference in localStorage', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    const button = screen.getByRole('button')
    await user.click(button)

    await waitFor(() => {
      expect(localStorage.getItem('theme')).toBe('dark')
    })

    // Re-render component and verify theme persists
    const { unmount } = render(<ThemeToggle />)
    unmount()
    
    render(<ThemeToggle />)
    
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('uses system preference when no saved theme', async () => {
    // Mock prefers-color-scheme: dark
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<ThemeToggle />)
    
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('has accessible aria-label', async () => {
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /toggle theme|switch to/i })
      expect(button).toHaveAttribute('aria-label')
    })
  })
})





