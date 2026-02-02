import { test } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots')
const TIMESTAMP = new Date().toISOString().slice(0, 10)

function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function shot(page: import('@playwright/test').Page, name: string) {
  ensureDir()
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  })
  console.log(`  📸 ${name}.png`)
}

test.describe('Capture README Screenshots', () => {
  test.setTimeout(600_000)

  test('capture key capability screenshots', async ({ page }) => {
    // Use a wide viewport for crisp screenshots
    await page.setViewportSize({ width: 1440, height: 900 })

    // ── Screenshot 1: Clean Home Page ──
    console.log('\n=== Screenshot 1: Home Page ===')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(2_000)
    await shot(page, '1_Home_Page')

    // ── Screenshot 2: Add Favorite Channels ──
    console.log('\n=== Screenshot 2: Add Favorite Channels ===')
    const channels = [
      'www.youtube.com/@LennysPodcast',
      'www.youtube.com/@howiaipodcast',
    ]

    for (let i = 0; i < channels.length; i++) {
      // Click "+ Add Channel" button
      const addBtn = page.locator('button').filter({ hasText: /Add Channel/i })
      await addBtn.waitFor({ state: 'visible', timeout: 10_000 })
      await addBtn.click()
      await page.waitForTimeout(500)

      // Fill channel URL
      const channelInput = page.locator('input[placeholder*="youtube.com"]').last()
      await channelInput.waitFor({ state: 'visible', timeout: 5_000 })
      await channelInput.fill(channels[i])
      await page.waitForTimeout(500)

      // Submit — click the confirm/add button (check mark or Add)
      const confirmBtn = page.locator('button').filter({ hasText: /^Add$|confirm/i }).last()
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click()
      } else {
        await channelInput.press('Enter')
      }

      console.log(`  Added channel ${i + 1}: ${channels[i]}`)
      await page.waitForTimeout(3_000)
    }

    // Wait for episodes to load
    console.log('  Waiting for episodes to load...')
    await page.waitForTimeout(10_000)
    await shot(page, '2_Favorite_Channels')

    // Expand channels to show episodes
    const collapsibles = page.locator('[data-state="closed"]').filter({ hasText: /Lenny|How I AI/i })
    const count = await collapsibles.count()
    for (let i = 0; i < count; i++) {
      await collapsibles.nth(i).click().catch(() => {})
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(1_000)
    await shot(page, '3_Channels_With_Episodes')

    // ── Screenshot 3: Get Transcript Flow ──
    console.log('\n=== Screenshot 3: Get Transcript ===')
    const VIDEO_URL = 'https://www.youtube.com/watch?v=YRhGtHfs1Lw'
    const urlInput = page.getByPlaceholder(/enter youtube url/i)
    await urlInput.fill(VIDEO_URL)
    await page.waitForTimeout(1_000)
    await page.getByRole('button', { name: /Get Transcript/i }).click()

    // Wait for video preview to appear
    const extractBtn = page.getByRole('button', { name: /Extract Transcript/i })
    await extractBtn.waitFor({ state: 'visible', timeout: 60_000 })
    await page.waitForTimeout(1_000)
    await shot(page, '4_Video_Preview')

    // ── Screenshot 4: Extract Transcript ──
    console.log('\n=== Screenshot 4: Extract Transcript ===')
    await extractBtn.click()
    console.log('  Processing transcript...')

    // Wait for AI Summary tab to appear
    const aiTab = page.locator('button, [role="tab"]').filter({ hasText: /AI Summary/i })
    await aiTab.waitFor({ state: 'visible', timeout: 60_000 })
    await page.waitForTimeout(1_000)

    // Scroll right column to show transcript content
    await shot(page, '5_Transcript_Processed')

    // ── Screenshot 5: AI Summary Tab ──
    console.log('\n=== Screenshot 5: AI Summary ===')
    await aiTab.click()
    await page.waitForTimeout(1_000)
    await shot(page, '6_AI_Summary_Options')

    // Select Anthropic provider and Narrative style, then generate
    const anthropicCard = page.locator('label[for="provider-anthropic"]')
    if (await anthropicCard.isVisible().catch(() => false)) {
      await anthropicCard.click()
    }
    await page.waitForTimeout(500)

    // Select Bullets style (default, should already be selected)
    const bulletsBtn = page.getByRole('button', { name: /^Bullets$/i })
    if (await bulletsBtn.isVisible().catch(() => false)) {
      await bulletsBtn.click()
    }
    await page.waitForTimeout(500)

    // Generate summary
    const generateBtn = page.getByRole('button', { name: /Generate Summary/i })
    await generateBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await generateBtn.click()
    console.log('  Generating AI summary...')

    // Wait for generation to complete
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[disabled]')
        if (btn && btn.textContent?.includes('Generating')) return false
        const spinners = document.querySelectorAll('[class*="animate-spin"], [class*="animate-pulse"]')
        return spinners.length === 0
      },
      { timeout: 120_000 }
    )
    await page.waitForTimeout(2_000)
    await shot(page, '7_AI_Summary_Result')

    // Scroll down to show full summary
    await page.evaluate(() => {
      const tabContent = document.querySelector('[role="tabpanel"]')
      if (tabContent) tabContent.scrollTop = tabContent.scrollHeight / 2
    })
    await page.waitForTimeout(500)

    // Take a full-page version too
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '8_AI_Summary_Full.png'),
      fullPage: true,
    })
    console.log('  📸 8_AI_Summary_Full.png')

    // ── Screenshot 6: Export/Download ──
    console.log('\n=== Screenshot 6: Export Controls ===')
    const videoTab = page.locator('button, [role="tab"]').filter({ hasText: /Video/i }).first()
    await videoTab.click()
    await page.waitForTimeout(1_000)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await shot(page, '9_Export_Controls')

    // ── Screenshot 7: Dark Mode ──
    console.log('\n=== Screenshot 7: Dark Mode ===')
    // Click theme toggle
    const themeBtn = page.getByLabel(/toggle theme|switch to dark/i)
    if (await themeBtn.isVisible().catch(() => false)) {
      await themeBtn.click()
      await page.waitForTimeout(1_000)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await shot(page, '10_Dark_Mode')

    console.log('\n=== ALL SCREENSHOTS CAPTURED ===')
    console.log(`Saved to: ${SCREENSHOT_DIR}/`)
  })
})
