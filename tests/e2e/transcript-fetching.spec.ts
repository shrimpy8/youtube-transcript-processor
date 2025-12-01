import { test, expect } from '@playwright/test'

test.describe('Transcript Fetching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display URL input', async ({ page }) => {
    const input = page.getByPlaceholderText(/enter youtube url/i)
    await expect(input).toBeVisible()
  })

  test('should validate URL input', async ({ page }) => {
    const input = page.getByPlaceholderText(/enter youtube url/i)
    
    // Type invalid URL
    await input.fill('not a valid url')
    
    // Wait for validation (debounced)
    await page.waitForTimeout(500)
    
    // Should show error or invalid state
    const errorMessage = page.getByText(/invalid/i).first()
    await expect(errorMessage).toBeVisible({ timeout: 2000 })
  })

  test('should accept valid YouTube URL', async ({ page }) => {
    const input = page.getByPlaceholderText(/enter youtube url/i)
    
    // Type valid URL
    await input.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    
    // Wait for validation
    await page.waitForTimeout(500)
    
    // Should show valid state (checkmark or success message)
    const successIndicator = page.getByText(/valid/i).first()
    await expect(successIndicator).toBeVisible({ timeout: 2000 })
  })

  // Note: Actual transcript fetching test would require a video with available transcript
  // This is a placeholder that can be expanded when we have test videos
  test.skip('should fetch transcript for valid video', async ({ page }) => {
    // This test would:
    // 1. Enter a valid YouTube URL
    // 2. Submit the form
    // 3. Wait for transcript to load
    // 4. Verify transcript is displayed
    // Skipped for now as it requires a specific test video
  })
})





