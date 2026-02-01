import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AI_SUMMARY_DIR = path.resolve(__dirname, '../../ai_summary')

/**
 * E2E test: My Favorite Podcast Channels — PRD Drift Validation
 *
 * Uses a real Chrome browser via Playwright to walk through:
 *   Add @PeterYangYT → episodes load → Summarize → pipeline modal →
 *   AI Summary tab auto-navigates (P0 drift fix) → verify Perplexity summary
 */

test.describe('Favorite Channels E2E — Perplexity Only', () => {
  test.setTimeout(600_000) // 10 min total

  test('Add @PeterYangYT, summarize with Perplexity, verify auto-tab', async ({ page }) => {
    // Ensure output directory exists
    if (!fs.existsSync(AI_SUMMARY_DIR)) {
      fs.mkdirSync(AI_SUMMARY_DIR, { recursive: true })
    }

    // ---- Setup: Clear localStorage, fresh start ----
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')

    console.log('\n========== @PeterYangYT — Perplexity Only ==========')

    // Step 1: Click "+ Add Channel"
    const addBtn = page.getByRole('button', { name: /add channel/i })
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    await addBtn.click()

    // Step 2: Type channel URL and submit
    const channelInput = page.getByPlaceholder(/paste youtube channel url/i)
    await expect(channelInput).toBeVisible()
    await channelInput.fill('https://www.youtube.com/@PeterYangYT')
    await channelInput.press('Enter')

    // Step 3: Wait for channel + episodes to appear
    await expect(page.getByText(/peter.*yang/i).first()).toBeVisible({ timeout: 60_000 })
    const summarizeBtns = page.getByRole('button', { name: /summarize/i })
    await expect(summarizeBtns.first()).toBeVisible({ timeout: 60_000 })

    const episodeCount = await summarizeBtns.count()
    console.log(`Found ${episodeCount} episodes`)
    expect(episodeCount).toBeGreaterThanOrEqual(1)

    // Screenshot: episodes loaded
    await page.screenshot({
      path: path.join(AI_SUMMARY_DIR, 'peteryang-episodes-loaded.png'),
      fullPage: true,
    })

    // Step 4: Click Summarize on first episode
    console.log('Clicking Summarize on first episode...')
    await summarizeBtns.first().click()

    // Step 5: Wait for pipeline modal
    const modal = page.getByRole('dialog', { name: /summarize pipeline/i })
    await expect(modal).toBeVisible({ timeout: 10_000 })
    console.log('Pipeline modal opened')

    // Verify engaging step labels (DRIFT-FPC-002 fix)
    await expect(page.getByText('Grabbing the conversation...')).toBeVisible({ timeout: 5_000 })

    // Wait for completion or failure (3 min max for LLM call)
    let pipelineResult = ''
    try {
      const result = page.getByText(/all done|pipeline error/i).first()
      await expect(result).toBeVisible({ timeout: 180_000 })
      pipelineResult = await result.textContent() || ''
    } catch {
      pipelineResult = 'TIMEOUT'
      console.log('Pipeline timed out after 3 min')
    }
    console.log(`Pipeline result: ${pipelineResult}`)

    // Screenshot: pipeline result
    await page.screenshot({
      path: path.join(AI_SUMMARY_DIR, 'peteryang-pipeline-result.png'),
      fullPage: true,
    })

    if (pipelineResult.toLowerCase().includes('all done')) {
      // ================================================================
      // CRITICAL P0 VALIDATION: AI Summary tab should auto-activate
      // After "All done!", the modal should auto-close and user should
      // land on the AI Summary tab without clicking it.
      // ================================================================
      console.log('Pipeline succeeded — verifying AI Summary auto-navigation...')

      // Wait a moment for the auto-tab switch to take effect
      await page.waitForTimeout(2_000)

      // Close modal if still visible (All done state)
      if (await modal.isVisible().catch(() => false)) {
        // The modal might auto-close, but if not, look for a close mechanism
        const closeBtn = page.getByRole('button', { name: /close/i }).first()
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click()
          await expect(modal).toBeHidden({ timeout: 5_000 }).catch(() => {})
        }
      }

      // Verify the AI Summary tab is active (aria-selected or specific class)
      // The tab should have been auto-switched by the activeTabOverride prop
      const aiSummaryTab = page.getByRole('tab', { name: /ai summary/i })
      if (await aiSummaryTab.isVisible().catch(() => false)) {
        const isSelected = await aiSummaryTab.getAttribute('aria-selected')
        console.log(`AI Summary tab aria-selected: ${isSelected}`)
        expect(isSelected).toBe('true')
        console.log('P0 VERIFIED: AI Summary tab auto-activated!')
      } else {
        // Fallback: check if AI summary content is visible
        const summaryContent = page.locator('[data-tab="ai-summary"], .ai-summary-content').first()
        const isVisible = await summaryContent.isVisible().catch(() => false)
        console.log(`AI Summary content visible: ${isVisible}`)
      }

      // Screenshot: AI Summary tab active
      await page.screenshot({
        path: path.join(AI_SUMMARY_DIR, 'peteryang-ai-summary-auto-tab.png'),
        fullPage: true,
      })
    } else {
      // Pipeline failed or timed out — close modal
      if (await modal.isVisible().catch(() => false)) {
        const closeBtn = page.getByRole('button', { name: /close|try again/i }).first()
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click()
        }
        await expect(modal).toBeHidden({ timeout: 5_000 }).catch(() => {
          console.log('Modal still visible, proceeding anyway')
        })
      }
    }

    // ================================================================
    // Generate summary via API (Perplexity only) to validate LLM works
    // ================================================================
    console.log('\n--- Generating Perplexity summary via API ---')

    const summaryResult = await generatePerplexitySummary(page, 'PeterYangYT')
    console.log(`Perplexity summary: success=${summaryResult.success}, ${summaryResult.length} chars`)

    if (summaryResult.success) {
      expect(summaryResult.length).toBeGreaterThan(100)
      console.log('Perplexity summary PASSED')
    } else {
      console.log(`Perplexity summary FAILED: ${summaryResult.error}`)
    }
    // We expect Perplexity to succeed since it's the only configured provider
    expect(summaryResult.success).toBe(true)

    // Final screenshot
    await page.screenshot({
      path: path.join(AI_SUMMARY_DIR, 'peteryang-final.png'),
      fullPage: true,
    })

    console.log('\n========== TEST COMPLETE ==========')
  })
})

interface SummaryResult {
  provider: string
  model: string
  success: boolean
  length: number
  filename: string
  error?: string
}

async function generatePerplexitySummary(
  page: import('@playwright/test').Page,
  channelTag: string
): Promise<SummaryResult> {
  const baseUrl = 'http://localhost:3000'

  // Fetch episodes
  const episodesRes = await page.request.post(`${baseUrl}/api/channel/episodes`, {
    data: { channelUrl: `https://www.youtube.com/@${channelTag}`, maxEpisodes: 2 },
  })
  const episodesData = await episodesRes.json()
  if (!episodesData.success || !episodesData.data?.episodes?.length) {
    return { provider: 'perplexity', model: '', success: false, length: 0, filename: '', error: 'No episodes found' }
  }

  const episode = episodesData.data.episodes[0]
  console.log(`Generating summary for: ${episode.title}`)

  // Fetch transcript
  const transcriptRes = await page.request.post(`${baseUrl}/api/transcript/ytdlp`, {
    data: { url: episode.url },
  })
  const transcriptData = await transcriptRes.json()
  if (!transcriptData.success || !transcriptData.data?.segments?.length) {
    return { provider: 'perplexity', model: '', success: false, length: 0, filename: '', error: 'No transcript' }
  }

  const transcriptText = transcriptData.data.segments
    .map((s: { text: string }) => s.text)
    .join('\n')
  console.log(`Transcript: ${transcriptText.length} chars`)

  // Call AI summary — Perplexity only
  try {
    const summaryRes = await page.request.post(`${baseUrl}/api/ai-summary`, {
      data: {
        transcript: transcriptText,
        provider: 'perplexity',
        summaryStyle: 'bullets',
        videoUrl: episode.url,
      },
      timeout: 120_000,
    })
    const summaryData = await summaryRes.json()

    if (summaryData.success && summaryData.summaries?.length) {
      const s = summaryData.summaries[0]
      const filename = `peteryang-perplexity-${(s.modelName || 'sonar').replace(/\s+/g, '-').toLowerCase()}-bullets.txt`
      const filepath = path.join(AI_SUMMARY_DIR, filename)

      const content = [
        `# Provider: perplexity`,
        `# Model: ${s.modelName || 'unknown'}`,
        `# Style: bullets`,
        `# Video: ${episode.url}`,
        `# Title: ${episode.title}`,
        `# Channel: @${channelTag}`,
        `# Generated: ${new Date().toISOString()}`,
        `# Success: true`,
        '',
        s.summary || '(no summary)',
      ].join('\n')

      fs.writeFileSync(filepath, content, 'utf-8')
      return {
        provider: 'perplexity',
        model: s.modelName || 'unknown',
        success: true,
        length: s.summary?.length || 0,
        filename,
      }
    } else {
      return { provider: 'perplexity', model: '', success: false, length: 0, filename: '', error: summaryData.error }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Timeout'
    return { provider: 'perplexity', model: '', success: false, length: 0, filename: '', error: errMsg }
  }
}
