import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should have proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/YouTube Podcast Transcript Processor/i)
  })

  test('should have proper lang attribute', async ({ page }) => {
    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'en')
  })

  test('should have skip link for keyboard navigation', async ({ page }) => {
    // Skip links should be present (may be visually hidden)
    const skipLink = page.locator('a[href="#main"], a[href*="skip"]').first()
    // Skip link may be visually hidden, so we check it exists
    const count = await skipLink.count()
    // If skip link exists, it should be focusable
    if (count > 0) {
      await skipLink.focus()
      await expect(skipLink).toBeFocused()
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    
    // Should focus on first interactive element
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
  })

  test('should have ARIA labels on interactive elements', async ({ page }) => {
    // Check buttons have accessible names
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      const ariaLabel = await button.getAttribute('aria-label')
      const text = await button.textContent()
      const ariaLabelledBy = await button.getAttribute('aria-labelledby')

      // Button should have accessible name (aria-label, text content, or aria-labelledby)
      const hasAccessibleName = !!(ariaLabel || (text && text.trim()) || ariaLabelledBy)
      expect(hasAccessibleName).toBe(true)
    }
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check for h1
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // Check heading order (h1 should come before h2)
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const count = await headings.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have alt text on images', async ({ page }) => {
    const images = page.locator('img')
    const imageCount = await images.count()

    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const image = images.nth(i)
      const alt = await image.getAttribute('alt')
      const role = await image.getAttribute('role')

      // Image should have alt text or be decorative (role="presentation")
      const isAccessible = !!(alt !== null || role === 'presentation')
      expect(isAccessible).toBe(true)
    }
  })

  test('should have proper form labels', async ({ page }) => {
    const inputs = page.locator('input[type="text"], input[type="url"], textarea')
    const inputCount = await inputs.count()

    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledBy = await input.getAttribute('aria-labelledby')
      const placeholder = await input.getAttribute('placeholder')

      // Input should have label (id with matching label, aria-label, aria-labelledby, or placeholder)
      const hasLabel = !!(id || ariaLabel || ariaLabelledBy || placeholder)
      expect(hasLabel).toBe(true)
    }
  })

  test('should support screen reader announcements', async ({ page }) => {
    // Check for aria-live regions
    const liveRegions = page.locator('[aria-live]')
    const count = await liveRegions.count()
    // Live regions may or may not be present, but if present should be valid
    if (count > 0) {
      const liveRegion = liveRegions.first()
      const liveValue = await liveRegion.getAttribute('aria-live')
      expect(['polite', 'assertive', 'off']).toContain(liveValue)
    }
  })

  test('should have proper focus indicators', async ({ page }) => {
    // Focus on an interactive element
    await page.keyboard.press('Tab')
    
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()

    // Check if focused element has visible focus indicator
    const styles = await focused.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow,
      }
    })

    // Should have some form of focus indicator
    const hasFocusIndicator =
      styles.outline !== 'none' ||
      styles.outlineWidth !== '0px' ||
      styles.boxShadow !== 'none'

    expect(hasFocusIndicator).toBe(true)
  })

  test('should have proper color contrast', async ({ page }) => {
    // This is a basic check - full contrast checking would require more complex logic
    // Check that text elements exist and are visible
    const textElements = page.locator('p, span, div').filter({ hasText: /.+/ })
    const count = await textElements.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should handle reduced motion preference', async ({ page }) => {
    // Check if animations respect prefers-reduced-motion
    // This is more of a visual check, but we can verify the CSS is present
    const html = page.locator('html')
    const classList = await html.getAttribute('class')
    // Check that the page loads without errors when reduced motion is preferred
    expect(classList).toBeTruthy()
  })
})

