import { sanitizeFilename } from './utils'

/**
 * Options for PDF export
 */
export interface PdfExportOptions {
  title: string
  provider: string
  summaryStyle: string
  date: string
  summary: string
  videoTitle?: string
}

/**
 * Simple markdown-to-PDF line parser
 * Parses a line and returns its type and cleaned text
 */
function parseLine(line: string): { type: 'h1' | 'h2' | 'h3' | 'h4' | 'bullet' | 'numbered' | 'table-row' | 'table-separator' | 'text'; text: string } {
  const trimmed = line.trim()
  if (trimmed.startsWith('#### ')) return { type: 'h4', text: trimmed.slice(5) }
  if (trimmed.startsWith('### ')) return { type: 'h3', text: trimmed.slice(4) }
  if (trimmed.startsWith('## ')) return { type: 'h2', text: trimmed.slice(3) }
  if (trimmed.startsWith('# ')) return { type: 'h1', text: trimmed.slice(2) }
  if (trimmed.match(/^\|[\s-:]+\|/)) return { type: 'table-separator', text: '' }
  if (trimmed.startsWith('|') && trimmed.endsWith('|')) return { type: 'table-row', text: trimmed }
  if (trimmed.match(/^[-*]\s/)) return { type: 'bullet', text: trimmed.slice(2) }
  if (trimmed.match(/^\d+\.\s/)) return { type: 'numbered', text: trimmed.replace(/^\d+\.\s/, '') }
  return { type: 'text', text: trimmed }
}

/**
 * Parses a markdown table row into cell values
 */
function parseTableCells(row: string): string[] {
  return row
    .split('|')
    .slice(1, -1) // Remove leading/trailing empty strings from split
    .map(cell => cell.trim())
}

/**
 * Strips markdown formatting for plain PDF text
 * Removes bold, italic, inline code, and link syntax
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')     // bold
    .replace(/\*(.+?)\*/g, '$1')          // italic
    .replace(/_(.+?)_/g, '$1')            // italic underscore
    .replace(/`(.+?)`/g, '$1')            // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links → text only
}

/**
 * Generates a PDF from summary markdown content
 * Uses dynamic import of jspdf to avoid bundle bloat
 *
 * @param options - PDF export options including title, provider, style, and summary content
 */
export async function generateSummaryPdf(options: PdfExportOptions): Promise<void> {
  const { title, provider, summaryStyle, date, summary, videoTitle } = options

  // Dynamic import to keep jspdf out of the main bundle
  const { default: jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 20
  const marginRight = 20
  const maxWidth = pageWidth - marginLeft - marginRight
  const lineHeight = 5.5
  let y = 25

  /**
   * Adds a new page if remaining space is insufficient
   */
  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage()
      y = 20
    }
  }

  /**
   * Writes wrapped text and advances cursor
   */
  function writeText(text: string, fontSize: number, isBold: boolean, indent: number = 0) {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(stripMarkdown(text), maxWidth - indent)
    for (const line of lines) {
      checkPageBreak(lineHeight)
      doc.text(line, marginLeft + indent, y)
      y += lineHeight
    }
  }

  // --- Title ---
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, marginLeft, y)
  y += 10

  // --- Subtitle (provider + style + date) ---
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`${provider}  •  ${summaryStyle} style  •  ${date}`, marginLeft, y)
  y += 4

  // --- Separator line ---
  doc.setDrawColor(200, 200, 200)
  doc.line(marginLeft, y, pageWidth - marginRight, y)
  y += 8
  doc.setTextColor(0, 0, 0)

  // --- Body ---
  const lines = summary.split('\n')

  /**
   * Renders a complete markdown table as a grid with borders
   */
  function renderTable(tableRows: string[][]) {
    if (tableRows.length === 0) return

    const colCount = tableRows[0].length
    const colWidth = maxWidth / colCount
    const cellPadding = 2
    const cellFontSize = 8
    const cellLineHeight = 4.5

    for (let rowIdx = 0; rowIdx < tableRows.length; rowIdx++) {
      const cells = tableRows[rowIdx]
      const isHeader = rowIdx === 0

      // Calculate row height based on tallest cell
      doc.setFontSize(cellFontSize)
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal')
      let maxCellLines = 1
      for (const cell of cells) {
        const wrapped = doc.splitTextToSize(stripMarkdown(cell), colWidth - cellPadding * 2)
        maxCellLines = Math.max(maxCellLines, wrapped.length)
      }
      const rowHeight = maxCellLines * cellLineHeight + cellPadding * 2

      checkPageBreak(rowHeight + 2)

      // Draw background for header
      if (isHeader) {
        doc.setFillColor(240, 240, 240)
        doc.rect(marginLeft, y, maxWidth, rowHeight, 'F')
      }

      // Draw cell borders and text
      for (let colIdx = 0; colIdx < colCount; colIdx++) {
        const cellX = marginLeft + colIdx * colWidth
        const cellText = colIdx < cells.length ? stripMarkdown(cells[colIdx]) : ''

        // Cell border
        doc.setDrawColor(200, 200, 200)
        doc.rect(cellX, y, colWidth, rowHeight)

        // Cell text
        doc.setFontSize(cellFontSize)
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal')
        doc.setTextColor(0, 0, 0)
        const wrapped = doc.splitTextToSize(cellText, colWidth - cellPadding * 2)
        for (let lineIdx = 0; lineIdx < wrapped.length; lineIdx++) {
          doc.text(wrapped[lineIdx], cellX + cellPadding, y + cellPadding + (lineIdx + 1) * cellLineHeight - 1)
        }
      }

      y += rowHeight
    }
    y += 3
  }

  // Collect table rows for batch rendering
  let pendingTableRows: string[][] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim() === '') {
      // Flush any pending table
      if (pendingTableRows.length > 0) {
        renderTable(pendingTableRows)
        pendingTableRows = []
      }
      y += 3
      continue
    }

    const parsed = parseLine(line)

    // Accumulate table rows
    if (parsed.type === 'table-row') {
      pendingTableRows.push(parseTableCells(parsed.text))
      continue
    }
    if (parsed.type === 'table-separator') {
      // Skip separator rows (---) — they don't render
      continue
    }

    // Flush any pending table before non-table content
    if (pendingTableRows.length > 0) {
      renderTable(pendingTableRows)
      pendingTableRows = []
    }

    switch (parsed.type) {
      case 'h1':
        checkPageBreak(12)
        y += 4
        writeText(parsed.text, 16, true)
        y += 2
        break
      case 'h2':
        checkPageBreak(10)
        y += 3
        writeText(parsed.text, 13, true)
        y += 1
        break
      case 'h3':
        checkPageBreak(8)
        y += 2
        writeText(parsed.text, 11, true)
        y += 1
        break
      case 'h4':
        checkPageBreak(7)
        y += 1
        writeText(parsed.text, 10, true)
        y += 1
        break
      case 'bullet':
        checkPageBreak(lineHeight)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('•', marginLeft + 4, y)
        writeText(parsed.text, 10, false, 10)
        break
      case 'numbered':
        checkPageBreak(lineHeight)
        writeText(parsed.text, 10, false, 6)
        break
      case 'text':
        writeText(parsed.text, 10, false)
        break
    }
  }

  // Flush any remaining table at end of document
  if (pendingTableRows.length > 0) {
    renderTable(pendingTableRows)
  }

  // --- Generate filename and download ---
  const sanitizedProvider = provider.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  let baseName = 'ai-summary'
  if (videoTitle) {
    baseName = sanitizeFilename(videoTitle, 30)
  }
  const filename = `${baseName}_${sanitizedProvider}_${summaryStyle}_${date}.pdf`

  doc.save(filename)
}
