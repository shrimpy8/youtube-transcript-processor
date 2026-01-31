# PRD-CORE: Summary Style Selector & PDF Export

## Problem

Currently, the app generates AI summaries in a single fixed format (structured bullet points per the `docs/prompt.md` template). Users have no control over how the summary is styled — someone wanting a quick scan needs the same dense output as someone wanting a deep-dive technical analysis. Additionally, bullet-point summaries lack video timestamp links, making it impossible to jump to the relevant section of the video.

Export is limited to TXT download of transcripts. Users who want to share summaries as polished PDFs have no path to do so.

## Success Criteria

- [ ] Users can select between 3 summary styles (bullets, narrative, technical) before generating
- [ ] Bullet-style summaries include clickable YouTube timestamp links for each bullet point
- [ ] Users can export any generated AI summary as PDF
- [ ] Existing default behavior (current structured summary) maps cleanly to the "bullets" style
- [ ] All summary styles work with all 3 LLM providers and "All" mode

## Scope

### In Scope

**Feature 1: Summary Style Selector**
- Three styles: Bullets, Narrative, Technical
- Style selector UI in the AI Summary card (alongside provider selection)
- Style-specific prompt templates
- Bullet style: each bullet includes a `?t=` YouTube timestamp link so user can jump to that section
- Timestamp links derived from transcript segment `start` times

**Feature 2: PDF Export**
- PDF export of AI summaries (client-side generation)
- Export button on each `AISummaryCard`

### Out of Scope

- Customizable/user-defined summary templates
- Notion export (future — see [Notion Export](#notion-export-future) appendix below)
- Google Docs, Markdown, or other export targets (future)
- Saving export preferences to local storage (future)
- Transcript export to PDF (only AI summaries)

---

## User Stories

### Summary Style Selector

1. **As a busy user**, I want a bullet-point summary with video links so I can quickly scan key points and jump to the relevant section in the video.
2. **As a content creator**, I want a narrative summary so I can repurpose the podcast insights as a blog post or newsletter draft.
3. **As a technical user**, I want a technical deep-dive summary so I can understand tools, architectures, and implementation details mentioned in the podcast.

### PDF Export

4. **As a user**, I want to export a summary as PDF so I can save it offline, print it, or share it via email.

---

## Detailed Design

### Feature 1: Summary Style Selector

#### Summary Styles

| Style | Description | Prompt Behavior | Timestamp Links |
|-------|-------------|-----------------|-----------------|
| **Bullets** | Structured bullet points grouped by topic (current default behavior) | Uses current `prompt.md` structure with added instruction to include `[MM:SS](youtube_url?t=Xs)` links per bullet | Yes — each bullet gets a timestamp link to the closest transcript segment |
| **Narrative** | Flowing prose paragraphs — reads like a blog post or article | Prompt instructs LLM to write in connected paragraphs, no bullet points, smooth transitions, 500-800 word range | No |
| **Technical** | Deep-dive with tool names, architectures, code snippets, comparisons | Prompt instructs LLM to focus on technical details, include tool/framework names, version numbers, architecture patterns, comparison tables where applicable | No |

#### Timestamp Link Generation (Bullets Style)

- The transcript already contains `TranscriptSegment[]` with `start` (seconds) and `text`
- When style is `bullets`, the prompt will instruct the LLM to reference timestamps
- Pass transcript text with inline timestamps (e.g., `[00:05:23] segment text`) so the LLM can cite them
- LLM outputs bullets like: `- Key insight about X ([05:23](https://youtube.com/watch?v=VIDEO_ID&t=323s))`
- The video URL and ID are available from `VideoMetadata` and will be passed to the API

#### API Changes

**`POST /api/ai-summary`** — Extended request body:

```typescript
interface AISummaryRequest {
  transcript: string          // existing
  provider: LLMProvider       // existing
  summaryStyle: SummaryStyle  // NEW: 'bullets' | 'narrative' | 'technical'
  videoUrl?: string           // NEW: needed for timestamp links in bullets style
}
```

**New type:**

```typescript
type SummaryStyle = 'bullets' | 'narrative' | 'technical'
```

#### Prompt Templates

Create style-specific prompt templates in `docs/`:
- `docs/prompt.md` — Remains the base (becomes the `bullets` template with timestamp instruction added)
- `docs/prompt-narrative.md` — Narrative style prompt
- `docs/prompt-technical.md` — Technical style prompt

All prompts share the same critical rules (accuracy, no hallucination) from the base template.

#### UI Changes

- Add a `SummaryStyle` selector (segmented control or radio group) in the `AISummary` component, placed between the provider selector and the Generate button
- Default selection: `Bullets`
- When `Bullets` is selected, show a subtle info note: "Includes video timestamp links"

### Feature 2: PDF Export

#### PDF Export

- **Approach**: Client-side PDF generation using a lightweight library (e.g., `jspdf` + markdown-to-PDF rendering, or `@react-pdf/renderer`)
- **Trigger**: "Export PDF" button on each `AISummaryCard`
- **Content**: Summary markdown rendered as styled PDF with:
  - Title: Video title
  - Subtitle: Provider name + summary style
  - Date generated
  - Summary body (formatted markdown → PDF)
- **Filename**: `{video-title}_{provider}_{style}_{date}.pdf`

#### UI Changes

- Add export buttons to `AISummaryCard`:
  - Current "Download" (TXT) button remains
  - Add "PDF" button (icon: file-text or file-down)
- Group export buttons in a button group to avoid clutter
- Show loading state on PDF button during generation
- Show success/error feedback (inline)

---

## Acceptance Criteria

### Summary Style Selector
- [ ] Style selector (Bullets / Narrative / Technical) is visible in the AI Summary section
- [ ] Selecting "Bullets" generates summary with YouTube timestamp links (format: `[MM:SS](url?t=Xs)`)
- [ ] Clicking a timestamp link in the rendered summary opens YouTube at the correct time
- [ ] Selecting "Narrative" generates a prose-style summary (no bullet points)
- [ ] Selecting "Technical" generates a technical deep-dive summary
- [ ] Style selection persists across provider changes (within the same session)
- [ ] All 3 styles work with each individual provider and "All" mode
- [ ] Default style is "Bullets"

### PDF Export
- [ ] "Export PDF" button appears on each AISummaryCard that has a generated summary
- [ ] Clicking "Export PDF" downloads a well-formatted PDF file
- [ ] PDF includes: video title, provider name, style, date, formatted summary content
- [ ] PDF renders markdown formatting (headings, bold, bullets, links)
- [ ] Timestamp links in PDF are clickable

---

## Dependencies

| Dependency | Purpose | Notes |
|-----------|---------|-------|
| `jspdf` or `@react-pdf/renderer` | Client-side PDF generation | Evaluate bundle size; prefer lighter option |
| `TranscriptSegment.start` | Timestamp data for video links | Already available in processed transcript |
| `VideoMetadata.url` / `VideoMetadata.id` | YouTube video URL for timestamp links | Already available |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM may not reliably include timestamps in bullet output | Timestamp links missing or wrong | Include explicit formatting instructions in prompt; validate output; fallback to bullets without links |
| LLM may hallucinate timestamps not in transcript | Links point to wrong video sections | Pass transcript with embedded timestamps so LLM can only cite real ones; add validation |
| PDF library adds significant bundle size | Slower page load | Use dynamic import (`next/dynamic`) to code-split PDF generation |
| Different LLM providers may format styles inconsistently | Inconsistent user experience across providers | Use very specific prompt instructions; test all provider × style combinations |

---

## Technical Notes

### Files Expected to Change

**New Files:**
- `docs/prompt-narrative.md` — Narrative style prompt template
- `docs/prompt-technical.md` — Technical style prompt template
- `src/lib/pdf-export.ts` — PDF generation utility

**Modified Files:**
- `src/types/index.ts` — Add `SummaryStyle` type, update `AISummaryRequest`
- `src/lib/llm-service.ts` — Load style-specific prompts, pass video URL for timestamps
- `src/app/api/ai-summary/route.ts` — Accept `summaryStyle` and `videoUrl` params
- `src/hooks/useAISummary.ts` — Pass style through to API
- `src/components/features/AISummary.tsx` — Add style selector UI
- `src/components/features/AISummaryCard.tsx` — Add PDF export button
- `src/lib/export-utils.ts` — Add PDF export function
- `src/lib/ai-summary-utils.ts` — Transcript-to-text with timestamps helper
- `docs/prompt.md` — Add timestamp link instructions for bullets style
- `README.md` — Document new features

---

## Appendix

### Notion Export (Future)

> **Status: OUT OF SCOPE** — Deferred to a future iteration.

When implemented, Notion export would include:

- **Approach**: Server-side API route that pushes content to Notion via the Notion API
- **Auth**: User provides a Notion Integration Token + target page/database ID via settings (stored in `.env.local` for now, UI settings page is out of scope)
- **API Route**: `POST /api/export/notion`
- **Content mapping**:
  - Page title: Video title
  - Page body: Summary content as Notion blocks (headings, bullet lists, paragraphs)
  - Properties/metadata: Provider, style, date, video URL
- **Feedback**: Success/error toast notification in the UI
- **Dependencies**: `@notionhq/client` (official SDK), Notion Integration Token
- **Environment Variables**:
  ```env
  NOTION_API_KEY=secret_...
  NOTION_PARENT_PAGE_ID=...    # Target page to create child pages under
  ```
- **Risks**: Notion API rate limits (3 req/s), token management UX is clunky with env vars only
