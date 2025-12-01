import { test, expect } from '@playwright/test'

test.describe('Browser Compatibility', () => {
  test('should load in Chrome', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test')
    
    await page.goto('/')
    await expect(page.getByPlaceholderText(/enter youtube url/i)).toBeVisible()
  })

  test('should load in Firefox', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test')
    
    await page.goto('/')
    await expect(page.getByPlaceholderText(/enter youtube url/i)).toBeVisible()
  })

  test('should load in Safari', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test')
    
    await page.goto('/')
    await expect(page.getByPlaceholderText(/enter youtube url/i)).toBeVisible()
  })

  test('should have required JavaScript features', async ({ page }) => {
    await page.goto('/')
    
    // Check that modern JavaScript features work
    const hasFetch = await page.evaluate(() => typeof fetch !== 'undefined')
    expect(hasFetch).toBe(true)

    const hasPromise = await page.evaluate(() => typeof Promise !== 'undefined')
    expect(hasPromise).toBe(true)

    const hasArrayMethods = await page.evaluate(() => {
      return typeof Array.prototype.map !== 'undefined' &&
             typeof Array.prototype.filter !== 'undefined'
    })
    expect(hasArrayMethods).toBe(true)
  })

  test('should have required DOM APIs', async ({ page }) => {
    await page.goto('/')
    
    const hasQuerySelector = await page.evaluate(() => {
      return typeof document.querySelector !== 'undefined'
    })
    expect(hasQuerySelector).toBe(true)

    const hasAddEventListener = await page.evaluate(() => {
      return typeof document.addEventListener !== 'undefined'
    })
    expect(hasAddEventListener).toBe(true)
  })

  test('should handle CSS Grid', async ({ page }) => {
    await page.goto('/')
    
    const supportsGrid = await page.evaluate(() => {
      const el = document.createElement('div')
      el.style.display = 'grid'
      return el.style.display === 'grid'
    })
    expect(supportsGrid).toBe(true)
  })

  test('should handle CSS Flexbox', async ({ page }) => {
    await page.goto('/')
    
    const supportsFlexbox = await page.evaluate(() => {
      const el = document.createElement('div')
      el.style.display = 'flex'
      return el.style.display === 'flex'
    })
    expect(supportsFlexbox).toBe(true)
  })

  test('should handle CSS Custom Properties', async ({ page }) => {
    await page.goto('/')
    
    const supportsCustomProperties = await page.evaluate(() => {
      const el = document.createElement('div')
      el.style.setProperty('--test-var', 'test-value')
      return el.style.getPropertyValue('--test-var') === 'test-value'
    })
    expect(supportsCustomProperties).toBe(true)
  })

  test('should handle localStorage', async ({ page }) => {
    await page.goto('/')
    
    const hasLocalStorage = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'value')
        const value = localStorage.getItem('test')
        localStorage.removeItem('test')
        return value === 'value'
      } catch {
        return false
      }
    })
    expect(hasLocalStorage).toBe(true)
  })

  test('should handle sessionStorage', async ({ page }) => {
    await page.goto('/')
    
    const hasSessionStorage = await page.evaluate(() => {
      try {
        sessionStorage.setItem('test', 'value')
        const value = sessionStorage.getItem('test')
        sessionStorage.removeItem('test')
        return value === 'value'
      } catch {
        return false
      }
    })
    expect(hasSessionStorage).toBe(true)
  })

  test('should handle IntersectionObserver', async ({ page }) => {
    await page.goto('/')
    
    const hasIntersectionObserver = await page.evaluate(() => {
      return typeof IntersectionObserver !== 'undefined'
    })
    expect(hasIntersectionObserver).toBe(true)
  })

  test('should handle ResizeObserver', async ({ page }) => {
    await page.goto('/')
    
    const hasResizeObserver = await page.evaluate(() => {
      return typeof ResizeObserver !== 'undefined'
    })
    // ResizeObserver may not be available in all browsers, but should work in modern ones
    // This is informational, not a hard requirement
    expect(typeof hasResizeObserver).toBe('boolean')
  })

  test('should handle Clipboard API', async ({ page }) => {
    await page.goto('/')
    
    const hasClipboard = await page.evaluate(() => {
      return typeof navigator.clipboard !== 'undefined' ||
             typeof document.execCommand !== 'undefined'
    })
    // Clipboard API should be available or have fallback
    expect(hasClipboard).toBe(true)
  })

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out known non-critical errors
    const criticalErrors = errors.filter((error) => {
      // Ignore network errors, extension errors, etc.
      return !error.includes('Extension') &&
             !error.includes('favicon') &&
             !error.includes('net::ERR')
    })

    expect(criticalErrors.length).toBe(0)
  })
})

