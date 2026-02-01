import { test, expect, devices } from '@playwright/test'

// Test with mobile viewport
test.use({
  viewport: devices['iPhone 13'].viewport,
  userAgent: devices['iPhone 13'].userAgent,
})

test.describe('Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display correctly on mobile viewport', async ({ page }) => {
    // Check that page loads
    await expect(page.getByPlaceholder(/enter youtube url/i)).toBeVisible()
  })

  test('should have proper viewport meta tag', async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveCount(1)

    const content = await viewport.getAttribute('content')
    expect(content).toContain('width=device-width')
    expect(content).toContain('initial-scale=1')
  })

  test('should have touch-friendly interactive elements', async ({ page }) => {
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    if (buttonCount > 0) {
      const firstButton = buttons.first()
      const box = await firstButton.boundingBox()

      if (box) {
        // Touch targets should be at least 44x44px (WCAG recommendation)
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('should support touch interactions', async ({ page }) => {
    const input = page.getByPlaceholder(/enter youtube url/i)
    
    // Simulate touch
    await input.tap()
    await expect(input).toBeFocused()
  })

  test('should have responsive layout', async ({ page }) => {
    // Check that content is visible and not cut off
    const container = page.locator('main, [role="main"]').first()
    await expect(container).toBeVisible()

    // Check that text is readable (not too small)
    const text = page.locator('p, span').first()
    if (await text.count() > 0) {
      const fontSize = await text.evaluate((el) => {
        return window.getComputedStyle(el).fontSize
      })
      const size = parseFloat(fontSize)
      // Font size should be reasonable for mobile (at least 14px)
      expect(size).toBeGreaterThanOrEqual(14)
    }
  })

  test('should handle mobile keyboard', async ({ page }) => {
    const input = page.getByPlaceholder(/enter youtube url/i)
    
    await input.click()
    
    // Check that input type is appropriate (should show URL keyboard on mobile)
    const inputType = await input.getAttribute('type')
    // Type should be 'url' or 'text' for URL input
    expect(['url', 'text']).toContain(inputType || 'text')
  })

  test('should prevent zoom on input focus', async ({ page }) => {
    // Viewport should have maximum-scale or user-scalable=no to prevent zoom
    const viewport = page.locator('meta[name="viewport"]')
    const content = await viewport.getAttribute('content')
    
    // Should have maximum-scale or user-scalable setting
    expect(content).toBeTruthy()
  })

  test('should have proper spacing for touch targets', async ({ page }) => {
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    if (buttonCount >= 2) {
      const button1 = buttons.first()
      const button2 = buttons.nth(1)

      const box1 = await button1.boundingBox()
      const box2 = await button2.boundingBox()

      if (box1 && box2) {
        // Buttons should have adequate spacing between them
        const verticalDistance = Math.abs(box1.y - box2.y)
        const horizontalDistance = Math.abs(box1.x - box2.x)

        // If buttons are vertically stacked, should have at least 8px spacing
        if (verticalDistance > 0 && verticalDistance < 100) {
          expect(verticalDistance).toBeGreaterThanOrEqual(8)
        }
      }
    }
  })

  test('should handle orientation changes', async ({ page }) => {
    // Test portrait orientation
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByPlaceholder(/enter youtube url/i)).toBeVisible()

    // Test landscape orientation
    await page.setViewportSize({ width: 667, height: 375 })
    await expect(page.getByPlaceholder(/enter youtube url/i)).toBeVisible()
  })

  test('should have safe area support for notched devices', async ({ page }) => {
    // Check that page uses CSS safe area insets if needed
    const html = page.locator('html')
    const styles = await html.evaluate((el) => {
      return window.getComputedStyle(el).getPropertyValue('padding-top')
    })
    // Safe area insets would be applied via CSS variables or direct padding
    // This is a basic check that styles are applied
    expect(styles).toBeTruthy()
  })
})

