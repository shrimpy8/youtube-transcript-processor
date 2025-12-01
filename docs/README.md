# Documentation Directory

This directory contains project documentation and development guides.

## 📚 Core Documentation (Keep in Git)

These documents are essential for understanding and maintaining the project:

- **[PRD-UI.md](./PRD-UI.md)** - Product Requirements Document defining the UI specifications and requirements
- **[MILESTONES.md](./MILESTONES.md)** - Development milestones with validation criteria, success metrics, and progress tracking
- **[ENV_VARIABLES.md](./ENV_VARIABLES.md)** - Environment variable configuration guide and API key setup instructions

## 🔧 Development Documentation (Keep in Git)

These documents help developers understand implementation details:

- **[API_VERIFICATION.md](./API_VERIFICATION.md)** - Verification that the implementation uses direct API calls to official providers
- **[DEBUG_LOGGING_DOCUMENTATION.md](./DEBUG_LOGGING_DOCUMENTATION.md)** - Guide for debug logging and error handling
- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Summary of refactoring decisions and improvements made

## 🔑 Runtime Configuration (Required - Keep in Git)

These files are used by the application at runtime:

- **[prompt.md](./prompt.md)** - AI summary prompt template - **REQUIRED** - Loaded at runtime by `src/lib/llm-service.ts` for LLM API calls. This file is read by the `loadPromptTemplate()` function and used for all AI summary generation (Anthropic, Google Gemini, Perplexity).

## 📝 Archive Folder

- **[archive/](./archive/)** - Folder for deprecated or archived documentation

## 🗂️ Documentation Guidelines

### What to Keep in Git

- **Public-facing documentation**: PRD, milestones, setup guides
- **Developer guides**: API verification, debugging guides, refactoring summaries
- **Configuration docs**: Environment variables, deployment guides

### What Can Be Archived

- Deprecated documentation
- Historical refactoring notes (after they're no longer relevant)
- Old versions of documentation

**Note**: `prompt.md` should NOT be archived as it's loaded at runtime by the LLM service.

### What Should NOT Be in Git

- Sensitive information (API keys, passwords)
- Large binary files
- Temporary notes or scratch files
- Personal development notes

## 📋 Current Documentation Status

All core documentation is up-to-date and reflects the current state of the project (100% milestone completion).

## ⚠️ Important Notes

### Runtime Dependencies

- **prompt.md** is loaded at runtime by `src/lib/llm-service.ts` via `loadPromptTemplate()`
- This file is read from the filesystem during API route execution
- If the file is missing, the code falls back to `DEFAULT_PROMPT_TEMPLATE` but the full prompt template provides better results
- **This file must be kept in git** and deployed with the application

### File Usage

```typescript
// src/lib/llm-service.ts line 44-64
export async function loadPromptTemplate(): Promise<string> {
  const promptPath = path.join(process.cwd(), 'docs', 'prompt.md')
  const promptContent = await fs.readFile(promptPath, 'utf-8')
  return trimmedContent
}
```

The prompt template is used in:
- `src/app/api/ai-summary/route.ts` - Loads template for all LLM providers
- All LLM API calls (Anthropic, Google Gemini, Perplexity) use this template

