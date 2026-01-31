# Development Tasks: Summary Style Selector & PDF Export

PRD: `docs/PRD-CORE-summary-style-and-export.md`

---

## Milestone 1: Foundation — Types & Prompt Templates

### Task 1.1: Add SummaryStyle type and update API types
- **Goal**: Define `SummaryStyle` type and extend `AISummaryRequest` to include `summaryStyle` and `videoUrl`
- **Acceptance**: `SummaryStyle` type exists, `AISummaryRequest` includes new fields, project compiles with no type errors
- **Estimate**: 1h
- **Files**: `src/types/index.ts`
- **Dependencies**: None

### Task 1.2: Create narrative prompt template
- **Goal**: Write `docs/prompt-narrative.md` — prose-style prompt sharing critical rules (accuracy, no hallucination) from base template, instructing LLM to produce flowing paragraphs (500-800 words), no bullet points, smooth transitions
- **Acceptance**: File exists with clear LLM instructions; maintains all critical rules from base `prompt.md`; explicitly forbids bullet-point formatting
- **Estimate**: 2h
- **Files**: `docs/prompt-narrative.md`
- **Dependencies**: None

### Task 1.3: Create technical prompt template
- **Goal**: Write `docs/prompt-technical.md` — technical deep-dive prompt sharing critical rules from base template, instructing LLM to focus on tool names, framework versions, architecture patterns, implementation details, and comparison tables
- **Acceptance**: File exists with clear LLM instructions; maintains all critical rules from base `prompt.md`; includes example output showing technical depth expected
- **Estimate**: 2h
- **Files**: `docs/prompt-technical.md`
- **Dependencies**: None

### Task 1.4: Update bullets prompt with timestamp link instructions
- **Goal**: Extend `docs/prompt.md` to instruct the LLM to include YouTube timestamp links in each bullet, using format `[MM:SS](youtube_url?t=Xs)` based on inline timestamps provided in the transcript
- **Acceptance**: Prompt includes explicit timestamp link formatting instructions; includes example output showing the `[MM:SS](url?t=Xs)` format; existing section structure preserved
- **Estimate**: 1h
- **Files**: `docs/prompt.md`
- **Dependencies**: None

---

## Milestone 2: Backend — Style-Aware Summary Generation

### Task 2.1: Add timestamped transcript formatter
- **Goal**: Create a utility function in `ai-summary-utils.ts` that converts `TranscriptSegment[]` into text with inline timestamps (e.g., `[00:05:23] segment text`) for the LLM to cite in bullets style
- **Acceptance**: Function takes segments array and returns timestamped text string; existing `transcriptToText` function still works unchanged for non-timestamped use; timestamps formatted as `[HH:MM:SS]`
- **Estimate**: 2h
- **Files**: `src/lib/ai-summary-utils.ts`
- **Dependencies**: Task 1.1

### Task 2.2: Update LLM service to load style-specific prompts
- **Goal**: Modify `llm-service.ts` to accept `SummaryStyle` parameter, load the corresponding prompt template file, and for `bullets` style inject the video URL into the prompt for timestamp links
- **Acceptance**: Prompt selection routes to correct template file by style; bullets prompt includes video URL; narrative and technical prompts load correctly; fallback to hardcoded template preserved for each style
- **Estimate**: 3h
- **Files**: `src/lib/llm-service.ts`
- **Dependencies**: Tasks 1.1, 1.2, 1.3, 1.4

### Task 2.3: Update AI summary API route
- **Goal**: Extend `POST /api/ai-summary` to accept `summaryStyle` and `videoUrl` in the request body, pass them through to the LLM service, default `summaryStyle` to `'bullets'` for backward compatibility
- **Acceptance**: API accepts new params; returns 400 for invalid style values; defaults to bullets when `summaryStyle` omitted; passes style and videoUrl to LLM service; existing callers work without changes
- **Estimate**: 2h
- **Files**: `src/app/api/ai-summary/route.ts`
- **Dependencies**: Tasks 2.1, 2.2

---

## Milestone 3: Frontend — Style Selector UI

### Task 3.1: Update useAISummary hook and API client to pass style and videoUrl
- **Goal**: Extend `useAISummary` hook's `generateSummary` function and the `generateAISummary` API client function to accept and forward `summaryStyle` and `videoUrl` parameters
- **Acceptance**: Hook passes new params through to `/api/ai-summary`; API client includes new fields in POST body; signature is backward-compatible (defaults to `'bullets'`)
- **Estimate**: 2h
- **Files**: `src/hooks/useAISummary.ts`, `src/lib/api-client.ts`
- **Dependencies**: Task 2.3

### Task 3.2: Pass videoUrl and raw segments from page to AISummary
- **Goal**: Thread `videoUrl` (from `VideoMetadata`) and raw transcript segments (for timestamped text generation) from `page.tsx` down to the `AISummary` component via props
- **Acceptance**: `AISummary` receives `videoUrl` and `rawSegments` props; parent `page.tsx` passes them from existing state; TypeScript compiles cleanly
- **Estimate**: 1h
- **Files**: `src/components/features/AISummary.tsx`, `src/app/page.tsx`
- **Dependencies**: Task 3.1

### Task 3.3: Add style selector UI to AISummary component
- **Goal**: Add a segmented control or radio group for summary style selection (Bullets / Narrative / Technical) between the provider selector and Generate button; default to "Bullets"; show info note "Includes video timestamp links" when Bullets is selected; wire selection to `generateSummary` call with correct transcript format (timestamped for bullets, plain for others)
- **Acceptance**: Style selector renders 3 options; selected style passed to `generateSummary`; bullets uses timestamped transcript text, others use plain text; info note visible only for bullets; style persists across provider changes within session
- **Estimate**: 3h
- **Files**: `src/components/features/AISummary.tsx`
- **Dependencies**: Task 3.2

---

## Milestone 4: PDF Export

### Task 4.1: Install PDF library and create PDF generation utility
- **Goal**: Install a client-side PDF library (evaluate `jspdf` vs `@react-pdf/renderer` — prefer lighter bundle size), create `src/lib/pdf-export.ts` with a function that converts summary markdown to a styled PDF with title, subtitle (provider + style), date, and body; use dynamic import to avoid bundle bloat
- **Acceptance**: PDF utility exists and is dynamically imported; generates valid PDF from markdown input; renders headings, bold, bullets, and links; PDF opens correctly in standard readers
- **Estimate**: 4h
- **Files**: `src/lib/pdf-export.ts`, `package.json`
- **Dependencies**: None

### Task 4.2: Pass summary style metadata to AISummaryCard
- **Goal**: Add `summaryStyle` to `AISummaryCard` props so PDF export and TXT download can include style in metadata/filename; update parent `AISummary` component to pass the selected style
- **Acceptance**: `AISummaryCard` receives `summaryStyle` prop; TXT download filename includes style name; TypeScript compiles cleanly
- **Estimate**: 1h
- **Files**: `src/components/features/AISummaryCard.tsx`, `src/components/features/AISummary.tsx`
- **Dependencies**: Task 3.3

### Task 4.3: Add PDF export button to AISummaryCard
- **Goal**: Add "Export PDF" button to each `AISummaryCard` alongside the existing download (TXT) button; wire it to the PDF generation utility; show loading spinner during PDF generation and success feedback after download
- **Acceptance**: PDF button visible on cards with generated summaries; clicking downloads correctly formatted PDF; loading state shown during generation; button group is clean (TXT + PDF side by side); no button shown when no summary exists
- **Estimate**: 3h
- **Files**: `src/components/features/AISummaryCard.tsx`
- **Dependencies**: Tasks 4.1, 4.2

---

## Milestone 5: Testing & Polish

### Task 5.1: Test all style × provider combinations
- **Goal**: Manually test all 3 styles with each of the 3 providers (9 combinations) plus "All" mode (3 more = 12 total); verify output quality, timestamp links (bullets only), and style-appropriate formatting
- **Acceptance**: All 12 combinations produce valid output; bullets include working YouTube timestamp links; narrative contains no bullet points; technical includes tool/framework details; no regressions in existing functionality
- **Estimate**: 3h
- **Files**: None (manual testing)
- **Dependencies**: Tasks 3.3, 2.3

### Task 5.2: Test PDF export across styles
- **Goal**: Test PDF export for summaries generated with each style; verify markdown rendering, link clickability, metadata correctness, and filename format
- **Acceptance**: PDF downloads for all 3 styles; headings/bold/bullets render correctly; timestamp links are clickable in PDF; filename follows `{title}_{provider}_{style}_{date}.pdf` pattern
- **Estimate**: 2h
- **Files**: None (manual testing)
- **Dependencies**: Task 4.3

### Task 5.3: Update README with new features
- **Goal**: Document the summary style selector and PDF export features in `README.md`; describe available styles, timestamp link behavior, and PDF export capability
- **Acceptance**: README feature list includes both new features; no setup changes required for styles; PDF export documented; existing documentation unchanged
- **Estimate**: 1h
- **Files**: `README.md`
- **Dependencies**: Tasks 5.1, 5.2

---

## Task Dependency Graph

```
Milestone 1 (all parallel):
  1.1 ─┐
  1.2 ─┤
  1.3 ─┼─→ Milestone 2: 2.1 → 2.2 → 2.3
  1.4 ─┘

Milestone 3 (sequential):
  2.3 → 3.1 → 3.2 → 3.3

Milestone 4:
  4.1 (parallel with M1-M3)
  3.3 → 4.2 → 4.3
  4.1 ──────→ 4.3

Milestone 5:
  3.3 + 2.3 → 5.1
  4.3 → 5.2
  5.1 + 5.2 → 5.3
```

---

## PRD Drift Log

_(To be updated during implementation)_

<!-- Template:
- [Date] [Item]: PRD said X, implemented Y because [reason]
-->
