import { test, expect } from '@playwright/test'

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should toggle theme when clicked', async ({ page }) => {
    // Check initial theme (should be light by default)
    const html = page.locator('html')
    await expect(html).not.toHaveClass(/dark/)

    // Find and click theme toggle button
    const themeToggle = page.getByRole('button', { name: /toggle theme|switch to/i })
    await expect(themeToggle).toBeVisible()
    
    await themeToggle.click()

    // Wait for theme to change
    await expect(html).toHaveClass(/dark/)

    // Click again to toggle back
    await themeToggle.click()
    await expect(html).not.toHaveClass(/dark/)
  })

  test('should persist theme preference', async ({ page, context }) => {
    // Set theme to dark
    const themeToggle = page.getByRole('button', { name: /toggle theme|switch to/i })
    await themeToggle.click()

    // Verify theme is dark
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)

    // Reload page
    await page.reload()

    // Theme should persist
    await expect(html).toHaveClass(/dark/)

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('theme'))
    expect(theme).toBe('dark')
  })

  test('should be keyboard accessible', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /toggle theme|switch to/i })
    
    // Tab to the button
    await page.keyboard.press('Tab')
    
    // Should be focused
    await expect(themeToggle).toBeFocused()

    // Press Enter to toggle
    await page.keyboard.press('Enter')
    
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
  })
})





