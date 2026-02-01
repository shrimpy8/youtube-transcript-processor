import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '../EmptyState'
import { NoTranscriptState } from '../NoTranscriptState'
import { NoVideosState } from '../NoVideosState'
import { FileText } from 'lucide-react'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items found" />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <EmptyState
        title="No items"
        description="Try adding some items"
      />
    )
    expect(screen.getByText('Try adding some items')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    const { container } = render(
      <EmptyState
        title="No items"
        icon={FileText}
      />
    )

    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('calls action onClick when action button is clicked', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Add item',
          onClick,
        }}
      />
    )

    const button = screen.getByText('Add item')
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not render action button when action is not provided', () => {
    render(<EmptyState title="No items" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState
        title="No items"
        className="custom-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('NoTranscriptState', () => {
  it('renders default message when videoTitle is not provided', () => {
    render(<NoTranscriptState />)
    expect(
      screen.getByText(/This video does not have captions/i)
    ).toBeInTheDocument()
  })

  it('renders message with video title when provided', () => {
    render(<NoTranscriptState videoTitle="Test Video" />)
    expect(screen.getByText(/"Test Video"/)).toBeInTheDocument()
    expect(
      screen.getByText(/does not have captions or transcripts available/i)
    ).toBeInTheDocument()
  })

  it('renders action button when onTryAnother is provided', () => {
    const onTryAnother = vi.fn()
    render(<NoTranscriptState onTryAnother={onTryAnother} />)

    const button = screen.getByText('Try Another Video')
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onTryAnother).toHaveBeenCalledTimes(1)
  })

  it('does not render action button when onTryAnother is not provided', () => {
    render(<NoTranscriptState />)
    expect(screen.queryByText('Try Another Video')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <NoTranscriptState className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('NoVideosState', () => {
  it('renders channel message by default', () => {
    render(<NoVideosState />)
    expect(screen.getByText(/This channel does not have any videos/i)).toBeInTheDocument()
  })

  it('renders playlist message when type is playlist', () => {
    render(<NoVideosState type="playlist" />)
    expect(screen.getByText(/This playlist does not have any videos/i)).toBeInTheDocument()
  })

  it('renders action button when onRefresh is provided', () => {
    const onRefresh = vi.fn()
    render(<NoVideosState onRefresh={onRefresh} />)

    const button = screen.getByText('Refresh')
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not render action button when onRefresh is not provided', () => {
    render(<NoVideosState />)
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <NoVideosState className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})

