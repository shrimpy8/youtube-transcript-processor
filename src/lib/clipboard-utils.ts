/**
 * Clipboard utilities for copying text to clipboard
 */

/**
 * Copies text to clipboard with error handling
 * @param text - Text to copy
 * @returns Promise that resolves when copy is complete
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    return fallbackCopyToClipboard(text)
  }

  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    // Fallback if clipboard API fails
    return fallbackCopyToClipboard(text)
  }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      if (successful) {
        resolve()
      } else {
        reject(new Error('Fallback copy command failed'))
      }
    } catch (error) {
      document.body.removeChild(textArea)
      reject(error)
    }
  })
}

/**
 * Copies selected text from the page
 * @returns The selected text or null if nothing is selected
 */
export function getSelectedText(): string | null {
  if (window.getSelection) {
    return window.getSelection()?.toString() || null
  }
  return null
}





