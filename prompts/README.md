# Prompt Templates

All LLM prompt templates used by the AI summary feature. These files are loaded at runtime by `src/lib/llm-service.ts` and must be deployed with the application.

## File Reference

| File | Purpose | Used by | Modes |
|------|---------|---------|-------|
| `bullets.md` | Bullet-point summary (10-15 bullets with YouTube timestamp links) | All 3 LLMs | Bullets |
| `narrative.md` | Flowing essay (Opening, Key Ideas, Practical Takeaways, Closing) | All 3 LLMs | Narrative |
| `technical.md` | Structured extraction (Tools, Workflows, Tips, Metrics) | All 3 LLMs | Technical |
| `anthropic-exclusions.xml` | XML-tagged hard exclusion rules injected into Anthropic's system prompt | Anthropic only | All modes |
| `fallback.md` | Minimal fallback prompt used when a template file fails to load | All 3 LLMs | All modes |

## How Prompts Are Sent to Each LLM

### Anthropic (Claude Sonnet 4.5)

Anthropic's Messages API supports a dedicated `system` parameter that the model treats as high-priority behavioral constraints. The code splits each template into two parts:

- **System prompt** (`system` param): Role, Critical Rules, Context, Constraints, Quality Checklist, Final Reminder sections + the `anthropic-exclusions.xml` content appended at the end
- **User message** (`messages[0]`): Task, Output Structure/Format, Examples, Episode Time Range, Transcript

This separation is handled by `buildAnthropicPromptParts()` in `src/lib/llm-api-helpers.ts`. Temperature is set to 0.1.

### Google Gemini (Gemini 2.5 Flash)

Gemini receives the entire template + transcript as a single content block via `buildFullPrompt()`. No system/user split. No XML exclusions. Temperature is 0.7.

### Perplexity (Sonar Online)

Perplexity receives the entire template + transcript as a single user message via `buildFullPrompt()`. No system/user split. No XML exclusions. Temperature is 0.7.

## Output Limits

| Mode | Limit | Enforced via |
|------|-------|-------------|
| Bullets | 10-15 bullet points | Critical Rule 5 in `bullets.md` |
| Narrative | 750-1000 words | Critical Rule 6 in `narrative.md` |
| Technical | 2000 words max | Critical Rule 8 in `technical.md` |

## Template Structure

All 3 style templates share the same `## Section` layout:

| Section | Goes into (Anthropic) | Purpose |
|---------|----------------------|---------|
| `## Role` | System prompt | Who the model is |
| `## Critical Rules` | System prompt | Hard constraints (accuracy, limits, exclusions) |
| `## Context` | System prompt | Grounding instructions |
| `## Task` | User message | What to produce |
| `## Output Format/Structure` | User message | Formatting rules and examples |
| `## Constraints` | System prompt | Length and style limits |
| `## Quality Checklist` | System prompt | Self-verification checklist |
| `## Final Reminder` | System prompt | Last-priority reinforcement |

For Gemini and Perplexity, all sections are concatenated into a single message.

## Editing Guidelines

- Changes to template files apply to all 3 LLMs immediately (no code deploy needed, just file update)
- Changes to `anthropic-exclusions.xml` only affect Anthropic
- Keep Critical Rules numbered sequentially within each template
- Test changes against at least 2 different transcripts before considering them final
