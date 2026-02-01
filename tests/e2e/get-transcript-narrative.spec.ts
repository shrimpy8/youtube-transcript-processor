import { test } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AI_SUMMARY_DIR = path.join(process.cwd(), 'ai_summary')
const SCREENSHOT_DIR = path.join(AI_SUMMARY_DIR, 'screenshots')
const TIMESTAMP = new Date().toISOString().slice(0, 10)

function ensureDirs() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function shot(page: import('@playwright/test').Page, name: string) {
  ensureDirs()
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}-${TIMESTAMP}.png`), fullPage: true })
}

test.describe('Regular Get Transcript + Narrative AI Summary (All LLMs)', () => {
  test.setTimeout(600_000)

  test('Get Transcript → Extract → Narrative Summary for all providers', async ({ page }) => {
    // Use a known video with captions
    const VIDEO_URL = 'https://www.youtube.com/watch?v=YRhGtHfs1Lw'

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle' })

    // 1. Enter URL and click Get Transcript
    console.log('Step 1: Get Transcript')
    const urlInput = page.getByPlaceholder(/enter youtube url/i)
    await urlInput.fill(VIDEO_URL)
    await page.waitForTimeout(1_000)

    await page.getByRole('button', { name: /Get Transcript/i }).click()
    await shot(page, 'narr-01-fetching')

    // 2. Wait for Extract Transcript button and click it
    console.log('Step 2: Extract Transcript')
    const extractBtn = page.getByRole('button', { name: /Extract Transcript/i })
    await extractBtn.waitFor({ state: 'visible', timeout: 60_000 })
    await shot(page, 'narr-02-extract-visible')

    await extractBtn.click()
    console.log('Clicked Extract Transcript, waiting for processing...')

    // Wait for AI Summary tab to appear (means transcript is processed)
    const aiTab = page.locator('button, [role="tab"]').filter({ hasText: /AI Summary/i })
    await aiTab.waitFor({ state: 'visible', timeout: 60_000 })
    await shot(page, 'narr-03-transcript-processed')
    console.log('✓ Transcript processed')

    // 3. Click AI Summary tab
    console.log('Step 3: Open AI Summary tab')
    await aiTab.click()
    await page.waitForTimeout(1_000)
    await shot(page, 'narr-04-ai-summary-tab')

    // 4. Select "All" providers — click the label card, not the hidden radio
    console.log('Step 4: Select All providers + Narrative style')
    const allProviderCard = page.locator('label[for="provider-all"]')
    await allProviderCard.waitFor({ state: 'visible', timeout: 5_000 })
    await allProviderCard.click()
    console.log('  Selected "All" provider')

    // 5. Select "Narrative" style
    const narrativeBtn = page.getByRole('button', { name: /^Narrative$/i })
    await narrativeBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await narrativeBtn.click()
    console.log('  Selected Narrative style')
    await page.waitForTimeout(500)
    await shot(page, 'narr-05-narrative-all-selected')

    // 6. Generate Summary
    console.log('Step 5: Generate Summary (all LLMs, narrative)')
    const generateBtn = page.getByRole('button', { name: /Generate Summary/i })
    await generateBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await generateBtn.click()
    await shot(page, 'narr-06-generating')

    // Wait for generation to complete — button text changes from "Generating..."
    console.log('Waiting for all providers to finish...')
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[disabled]')
        if (btn && btn.textContent?.includes('Generating')) return false
        // Also check for loading spinners in summary cards
        const spinners = document.querySelectorAll('[class*="animate-spin"], [class*="animate-pulse"]')
        return spinners.length === 0
      },
      { timeout: 300_000 }
    )
    await page.waitForTimeout(3_000)
    await shot(page, 'narr-07-summary-complete')
    console.log('✓ Summary generation complete')

    // 7. Capture results — screenshots
    console.log('Step 6: Capturing results')

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await shot(page, 'narr-08-results-top')

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForTimeout(500)
    await shot(page, 'narr-09-results-middle')

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await shot(page, 'narr-10-results-bottom')

    // 8. Extract summary text content from each provider card
    console.log('Step 7: Extracting summary text')
    const summaryTexts = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="Card"], [class*="card"]')
      const results: Record<string, string> = {}
      cards.forEach(card => {
        const heading = card.querySelector('h3, h4, [class*="CardTitle"]')
        const content = card.querySelector('[class*="prose"], [class*="markdown"], p')
        if (heading && content) {
          results[heading.textContent?.trim() || 'unknown'] = content.textContent?.trim() || ''
        }
      })
      return results
    })

    // Save summary texts as JSON
    ensureDirs()
    fs.writeFileSync(
      path.join(AI_SUMMARY_DIR, `narrative-all-llms-${TIMESTAMP}.json`),
      JSON.stringify({
        video: VIDEO_URL,
        date: new Date().toISOString(),
        style: 'narrative',
        providers: 'all',
        summaries: summaryTexts,
      }, null, 2),
      'utf-8'
    )
    console.log('✓ Summary JSON saved')

    // 9. Download TXT — switch to Video tab (which contains ExportControls) and click Download TXT
    console.log('Step 8: Downloading TXT transcript')
    const videoTab = page.locator('button, [role="tab"]').filter({ hasText: /Video/i }).first()
    await videoTab.click()
    await page.waitForTimeout(1_000)
    // Scroll down to find the Export Controls section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null)
    const downloadBtn = page.getByRole('button', { name: /Download TXT/i })
    await downloadBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await downloadBtn.click()

    const download = await downloadPromise
    if (download) {
      const savePath = path.join(AI_SUMMARY_DIR, `narrative-transcript-${TIMESTAMP}.txt`)
      await download.saveAs(savePath)
      console.log(`✓ TXT downloaded to ${savePath}`)
    } else {
      console.log('⚠ TXT download did not trigger (may use blob URL)')
    }

    await shot(page, 'narr-11-download-complete')
    console.log('✓ Results captured in ai_summary/')
    console.log('\n=== TEST COMPLETE ===')
  })
})
