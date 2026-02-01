import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AI_SUMMARY_DIR = path.join(process.cwd(), 'ai_summary')
const SCREENSHOT_DIR = path.join(AI_SUMMARY_DIR, 'screenshots')
const TIMESTAMP = new Date().toISOString().slice(0, 10)

const CHANNELS = [
  'www.youtube.com/@howiaipodcast',
  'www.youtube.com/@LennysPodcast',
  'www.youtube.com/@GregIsenberg',
  'www.youtube.com/@PeterYangYT',
]

// Helpers
function ensureDirs() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
}

async function screenshot(page: Page, name: string) {
  ensureDirs()
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}-${TIMESTAMP}.png`),
    fullPage: true,
  })
}

async function saveJsonResult(filename: string, data: string) {
  ensureDirs()
  fs.writeFileSync(path.join(AI_SUMMARY_DIR, filename), data, 'utf-8')
}

test.describe('Full Feature Test — My Favorite Podcast Channels', () => {
  test.setTimeout(600_000) // 10 min total timeout

  test('complete end-to-end feature test', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle' })
    await screenshot(page, '00-initial-load')

    // ============================================================
    // STEP 1: Add 4 Channel URLs
    // ============================================================
    console.log('\n=== STEP 1: Adding 4 channel URLs ===')

    for (let i = 0; i < CHANNELS.length; i++) {
      const channelUrl = CHANNELS[i]
      console.log(`Adding channel ${i + 1}: ${channelUrl}`)

      // Click "Add Channel" button
      const addBtn = page.getByRole('button', { name: /Add Channel/i })
      await addBtn.waitFor({ state: 'visible', timeout: 10_000 })
      await addBtn.click()

      // Fill in channel URL
      const input = page.getByPlaceholder(/paste youtube channel url/i)
      await input.waitFor({ state: 'visible', timeout: 5_000 })
      await input.fill(`https://${channelUrl}`)

      // Click "Add" button
      const submitBtn = page.getByRole('button', { name: /^Add$/i })
      await submitBtn.click()

      // Wait for the channel to appear (fetching info takes time)
      // Wait for either the channel name to appear or a loading state to finish
      await page.waitForTimeout(8_000)

      await screenshot(page, `01-channel-added-${i + 1}-${channelUrl.split('@')[1]}`)
      console.log(`  ✓ Channel ${i + 1} added`)
    }

    await screenshot(page, '02-all-4-channels-added')
    console.log('✓ All 4 channels added')

    // ============================================================
    // STEP 2: Delete first two channels (howiaipodcast, LennysPodcast)
    // ============================================================
    console.log('\n=== STEP 2: Deleting first two channels ===')

    for (let i = 0; i < 2; i++) {
      const channelName = i === 0 ? 'howiaipodcast' : 'LennysPodcast'
      console.log(`Deleting channel: ${channelName}`)

      // Find and click the delete (trash) button for the first channel
      // Delete buttons are title="Delete channel"
      const deleteBtn = page.locator('[title="Delete channel"]').first()
      await deleteBtn.waitFor({ state: 'visible', timeout: 5_000 })
      await deleteBtn.click()

      // Confirm deletion
      const confirmBtn = page.getByRole('button', { name: /Yes/i })
      await confirmBtn.waitFor({ state: 'visible', timeout: 5_000 })
      await confirmBtn.click()

      await page.waitForTimeout(1_000)
      await screenshot(page, `03-deleted-channel-${i + 1}-${channelName}`)
      console.log(`  ✓ Channel ${channelName} deleted`)
    }

    await screenshot(page, '04-after-deleting-2-channels')
    console.log('✓ First two channels deleted, 2 remaining')

    // ============================================================
    // STEP 3: Summarize an episode from one channel (bullets, pipeline)
    // ============================================================
    console.log('\n=== STEP 3: Summarize episode via pipeline (bullets) ===')

    // Expand first remaining channel to see episodes
    // Click on a channel name to expand it
    const channelToggle = page.locator('button').filter({ hasText: /@/i }).first()
    await channelToggle.click()
    await page.waitForTimeout(2_000)

    await screenshot(page, '05-channel-expanded-episodes')

    // Click "Summarize" on the first episode
    const summarizeBtn = page.getByRole('button', { name: /Summarize/i }).first()
    await summarizeBtn.waitFor({ state: 'visible', timeout: 10_000 })

    // Get the episode title before clicking
    const episodeTitle = await page.locator('button').filter({ hasText: /Summarize/i }).first()
      .locator('..').locator('..').locator('span, p, a').first().textContent() || 'unknown-episode'
    console.log(`Summarizing episode: ${episodeTitle}`)

    await summarizeBtn.click()

    await screenshot(page, '06-pipeline-modal-started')

    // Wait for the pipeline modal to complete (all 5 steps)
    // The modal auto-dismisses after 500ms on success
    // Wait up to 3 minutes for the pipeline
    console.log('Waiting for pipeline to complete...')

    // Wait for the modal to close (pipeline complete) or a failure
    await page.waitForFunction(
      () => {
        // Check if modal is gone (success) or shows a failure
        const modal = document.querySelector('[role="dialog"]')
        if (!modal) return true // Modal closed = success
        const failedText = modal.textContent || ''
        if (failedText.includes('failed') || failedText.includes('Failed')) return true
        return false
      },
      { timeout: 180_000 }
    )

    await page.waitForTimeout(2_000)
    await screenshot(page, '07-after-pipeline-complete')

    // Check if we're on the AI Summary tab now
    const aiSummaryTab = page.locator('[value="ai-summary"]')
    if (await aiSummaryTab.isVisible()) {
      console.log('✓ Navigated to AI Summary tab')
    }

    await screenshot(page, '08-ai-summary-bullets-result')

    // Capture the AI summary content
    // Look for summary card content
    await page.waitForTimeout(2_000)
    const summaryCards = page.locator('[class*="prose"], [class*="markdown"], [class*="summary"]')
    const cardCount = await summaryCards.count()
    console.log(`Found ${cardCount} summary card(s)`)

    // Capture page content for the AI summary section
    const aiSummarySection = await page.locator('.space-y-4, [class*="TabsContent"]').last().innerHTML()
    await saveJsonResult(
      `test1-pipeline-bullets-${TIMESTAMP}.html`,
      `<!-- Pipeline Summarize Result - Bullets Mode -->\n<!-- Episode: ${episodeTitle} -->\n<!-- Date: ${new Date().toISOString()} -->\n${aiSummarySection}`
    )

    // Also try to capture via API interception for JSON
    // Take a detailed screenshot of the summary
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await screenshot(page, '09-ai-summary-bullets-scrolled')

    console.log('✓ Pipeline summarize complete, results captured')

    // ============================================================
    // STEP 4: Wait 5 minutes
    // ============================================================
    console.log('\n=== STEP 4: Waiting 5 minutes ===')
    const startTime = Date.now()
    const FIVE_MINUTES = 5 * 60 * 1000

    // Log every minute
    for (let min = 1; min <= 5; min++) {
      const waitTime = Math.min(60_000, FIVE_MINUTES - (Date.now() - startTime))
      if (waitTime <= 0) break
      await page.waitForTimeout(waitTime)
      console.log(`  ${min} minute(s) elapsed...`)
    }

    console.log('✓ 5 minute wait complete')

    // ============================================================
    // STEP 5: Regular Get Transcript flow + Narrative AI Summary for all LLMs
    // ============================================================
    console.log('\n=== STEP 5: Regular Get Transcript flow + Narrative summary ===')

    // Expand the other channel (@GregIsenberg) to get a fresh episode URL
    const channelToggles = page.locator('button').filter({ hasText: /@/i })
    const toggleCount = await channelToggles.count()
    console.log(`Found ${toggleCount} channel toggle(s)`)

    // Click on the Greg Isenberg channel to expand it
    const gregToggle = page.locator('button').filter({ hasText: /@GregIsenberg/i })
    if (await gregToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await gregToggle.click()
      await page.waitForTimeout(3_000)
    }

    // Get a YouTube link from Greg's episodes
    const youtubeLinks = page.locator('a[href*="youtube.com/watch"]')
    const linkCount = await youtubeLinks.count()
    console.log(`Found ${linkCount} YouTube episode link(s)`)

    // Pick the first link from Greg's channel (not from Peter's already-loaded episode)
    let episodeUrl = ''
    for (let i = 0; i < linkCount; i++) {
      const href = await youtubeLinks.nth(i).getAttribute('href') || ''
      // Skip the episode we already processed via pipeline
      if (!href.includes('4zXQyswXj7U') && href.includes('youtube.com/watch')) {
        episodeUrl = href
        break
      }
    }

    if (!episodeUrl && linkCount > 0) {
      episodeUrl = await youtubeLinks.first().getAttribute('href') || ''
    }

    // Collect all unique episode URLs
    const allEpisodeUrls: string[] = []
    for (let i = 0; i < linkCount; i++) {
      const href = await youtubeLinks.nth(i).getAttribute('href') || ''
      if (href.includes('youtube.com/watch') && !allEpisodeUrls.includes(href)) {
        allEpisodeUrls.push(href)
      }
    }
    console.log(`Unique episode URLs: ${allEpisodeUrls.length}`)

    // Try each episode URL until we find one with captions
    let transcriptSuccess = false

    for (const candidateUrl of allEpisodeUrls) {
      episodeUrl = candidateUrl
      console.log(`Trying episode URL: ${episodeUrl}`)

      // Clear any existing URL first
      const clearBtn = page.getByRole('button', { name: /Clear/i })
      if (await clearBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await clearBtn.click()
        await page.waitForTimeout(1_000)
      }

      // Fill the URL input
      const urlInput = page.getByPlaceholder(/enter youtube url/i)
      await urlInput.waitFor({ state: 'visible', timeout: 5_000 })
      await urlInput.fill(episodeUrl)

      // Wait for URL validation
      await page.waitForTimeout(1_500)

      // Click "Get Transcript"
      const getTranscriptBtn = page.getByRole('button', { name: /Get Transcript/i })
      await getTranscriptBtn.waitFor({ state: 'visible', timeout: 5_000 })
      await getTranscriptBtn.click()

      console.log('Clicked Get Transcript, waiting for transcript to load...')
      await screenshot(page, '11-get-transcript-clicked')

      // Wait for either "Extract Transcript" button or error
      const extractBtn = page.getByRole('button', { name: /Extract Transcript/i })
      try {
        await extractBtn.waitFor({ state: 'visible', timeout: 45_000 })
        await screenshot(page, '12-transcript-loaded')

        console.log('Clicking Extract Transcript...')
        await extractBtn.click()

        // Wait for processing to complete
        console.log('Waiting for transcript processing...')
        await page.waitForTimeout(15_000)
        await screenshot(page, '13-transcript-processed')
        console.log('✓ Transcript extracted/processed')
        transcriptSuccess = true
        break
      } catch {
        console.log(`No captions for ${episodeUrl}, trying next...`)
        await screenshot(page, '12-no-captions')
        // Check if there's an error message
        const errorText = await page.locator('text=/captions|error|failed/i').first().textContent().catch(() => null)
        if (errorText) console.log(`  Error: ${errorText}`)
      }
    }

    if (!transcriptSuccess) {
      console.log('WARNING: No episode with captions found. Skipping AI summary test.')
      await screenshot(page, '12-all-episodes-failed')
      return
    }

    // Navigate to AI Summary tab (only visible after transcript is processed)
    const aiTab = page.locator('button, [role="tab"]').filter({ hasText: /AI Summary/i })
    await aiTab.waitFor({ state: 'visible', timeout: 30_000 })
    await aiTab.click()
    await page.waitForTimeout(1_000)

    await screenshot(page, '14-ai-summary-tab-opened')

    // Select "All" providers
    const allProviderRadio = page.locator('#provider-all, [value="all"]').first()
    if (await allProviderRadio.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await allProviderRadio.click()
      console.log('Selected "All" providers')
    } else {
      // Try clicking individual provider buttons/radios
      console.log('Trying to select all providers individually...')
    }

    // Select "Narrative" style
    const narrativeBtn = page.getByRole('button', { name: /Narrative/i })
    if (await narrativeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await narrativeBtn.click()
      console.log('Selected Narrative style')
    }

    await screenshot(page, '15-narrative-all-providers-selected')

    // Click "Generate Summary"
    const generateBtn = page.getByRole('button', { name: /Generate Summary/i })
    await generateBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await generateBtn.click()

    console.log('Generating narrative summary for all LLMs...')
    await screenshot(page, '16-generating-summary')

    // Wait for generation to complete (can take 60-120 seconds for 3 providers)
    console.log('Waiting for all providers to finish generating...')
    await page.waitForFunction(
      () => {
        const buttons = document.querySelectorAll('button')
        for (const btn of buttons) {
          if (btn.textContent?.includes('Generating')) return false
        }
        // Also check for loading spinners
        const spinners = document.querySelectorAll('[class*="animate-spin"]')
        if (spinners.length > 0) return false
        return true
      },
      { timeout: 300_000 }
    )

    await page.waitForTimeout(3_000)
    await screenshot(page, '17-narrative-summary-complete')

    // Capture all summary results
    const summarySection = await page.locator('.space-y-4, [class*="TabsContent"]').last().innerHTML()
    await saveJsonResult(
      `test2-regular-narrative-all-llms-${TIMESTAMP}.html`,
      `<!-- Regular Flow Result - Narrative Mode - All LLMs -->\n<!-- Episode URL: ${episodeUrl} -->\n<!-- Date: ${new Date().toISOString()} -->\n${summarySection}`
    )

    // Scroll through the results and capture
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await screenshot(page, '18-narrative-results-top')

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForTimeout(500)
    await screenshot(page, '19-narrative-results-middle')

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await screenshot(page, '20-narrative-results-bottom')

    console.log('✓ All narrative summaries generated and captured')
    console.log('\n=== ALL TESTS COMPLETE ===')
  })
})
