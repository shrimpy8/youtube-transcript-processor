import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExportControls } from '../ExportControls'
import { ProcessedTranscript } from '@/types'
import * as exportUtils from '@/lib/export-utils'

const mockTranscript: ProcessedTranscript = {
  segments: [
    { text: 'Hello world', start: 0, duration: 2 },
  ],
  speakers: ['Host'],
  totalDuration: 2,
  wordCount: 2,
}

describe('ExportControls', () => {
  beforeEach(() => {
    vi.spyOn(exportUtils, 'exportAndDownload').mockResolvedValue()
  })

  it('should render export controls', () => {
    render(<ExportControls transcript={mockTranscript} />)

    expect(screen.getByText('Export Transcript')).toBeInTheDocument()
    expect(screen.getByText('Download TXT')).toBeInTheDocument()
  })

  it('should have metadata toggle enabled by default', () => {
    render(<ExportControls transcript={mockTranscript} />)

    const metadataSwitch = screen.getByLabelText('Include Metadata')
    expect(metadataSwitch).toBeChecked()
  })

  it('should have timestamps toggle disabled by default', () => {
    render(<ExportControls transcript={mockTranscript} />)

    const timestampsSwitch = screen.getByLabelText('Include Timestamps')
    expect(timestampsSwitch).not.toBeChecked()
  })

  it('should toggle metadata option', () => {
    render(<ExportControls transcript={mockTranscript} />)

    const metadataSwitch = screen.getByLabelText('Include Metadata')
    fireEvent.click(metadataSwitch)

    expect(metadataSwitch).not.toBeChecked()
  })

  it('should toggle timestamps option', () => {
    render(<ExportControls transcript={mockTranscript} />)

    const timestampsSwitch = screen.getByLabelText('Include Timestamps')
    fireEvent.click(timestampsSwitch)

    expect(timestampsSwitch).toBeChecked()
  })

  it('should export when download button clicked', async () => {
    render(<ExportControls transcript={mockTranscript} />)

    const downloadButton = screen.getByText('Download TXT')
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(exportUtils.exportAndDownload).toHaveBeenCalledWith(
        mockTranscript,
        'txt',
        {
          includeMetadata: true,
          includeTimestamps: false,
        },
        undefined
      )
    })
  })

  it('should show loading state during export', async () => {
    vi.spyOn(exportUtils, 'exportAndDownload').mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(<ExportControls transcript={mockTranscript} />)

    const downloadButton = screen.getByText('Download TXT')
    fireEvent.click(downloadButton)

    expect(screen.getByText('Exporting...')).toBeInTheDocument()
    expect(downloadButton).toBeDisabled()
  })

  it('should show success state after export', async () => {
    render(<ExportControls transcript={mockTranscript} />)

    const downloadButton = screen.getByText('Download TXT')
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(screen.getByText('Exported!')).toBeInTheDocument()
    })
  })

  it('should pass video title to export function', async () => {
    render(<ExportControls transcript={mockTranscript} videoTitle="Test Video" />)

    const downloadButton = screen.getByText('Download TXT')
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(exportUtils.exportAndDownload).toHaveBeenCalledWith(
        mockTranscript,
        'txt',
        expect.any(Object),
        'Test Video'
      )
    })
  })

  it('should pass correct options when toggles are changed', async () => {
    render(<ExportControls transcript={mockTranscript} />)

    // Toggle both options
    fireEvent.click(screen.getByLabelText('Include Metadata'))
    fireEvent.click(screen.getByLabelText('Include Timestamps'))

    const downloadButton = screen.getByText('Download TXT')
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(exportUtils.exportAndDownload).toHaveBeenCalledWith(
        mockTranscript,
        'txt',
        {
          includeMetadata: false,
          includeTimestamps: true,
        },
        undefined
      )
    })
  })
})





