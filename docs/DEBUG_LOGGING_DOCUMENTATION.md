# Debug Logging, Error Handling, and Documentation Summary

## Overview
Enhanced the AI Summary feature with comprehensive debug logging (using DEBUG env var), improved error handling, and thorough inline documentation.

## DEBUG Environment Variable Integration

### Implementation
All logging respects the `DEBUG` environment variable from `.env`:
- `DEBUG=true` - Shows all debug and info logs
- `DEBUG=false` or unset - Only shows warnings and errors

### Logger Usage
Created logger instances using `createLogger()` from `src/lib/logger.ts`:
- `src/lib/llm-service.ts` - `createLogger('llm-service')`
- `src/app/api/ai-summary/route.ts` - `createLogger('ai-summary-api')`

### Log Levels Used

#### Debug Logs (only when DEBUG=true)
- API request details (endpoints, models, prompt lengths)
- Retry attempts with timing information
- Prompt template loading
- State transitions
- Request parsing

#### Info Logs (only when DEBUG=true)
- Successful operations (summary generation, template loading)
- Summary statistics (length, provider counts)
- Operation start/completion

#### Warning Logs (always shown)
- Invalid input validation failures
- Retry exhaustion
- Non-critical errors

#### Error Logs (always shown)
- API failures with full error context
- Configuration errors (missing API keys)
- Unexpected errors with stack traces

## Error Handling Improvements

### API Route (`src/app/api/ai-summary/route.ts`)
- ✅ Input validation with detailed error messages
- ✅ Transcript length validation (prevents abuse)
- ✅ Provider validation
- ✅ Try-catch with proper error mapping
- ✅ Uses `handleApiError` helper for consistent error responses
- ✅ Logging at each validation step

### LLM Service (`src/lib/llm-service.ts`)
- ✅ API key validation with clear error messages
- ✅ Retry logic with exponential backoff
- ✅ Detailed error logging with context
- ✅ Response validation (checks for content)
- ✅ Error propagation with provider context
- ✅ Graceful fallback for prompt template loading

### API Helpers (`src/lib/llm-api-helpers.ts`)
- ✅ Centralized error parsing
- ✅ HTTP status code handling (429, 401, 403)
- ✅ User-friendly error messages
- ✅ Safe JSON parsing with fallback

### Hook (`src/hooks/useAISummary.ts`)
- ✅ Input validation (transcript required)
- ✅ Error state management per provider
- ✅ Partial failure handling (when "all" selected)
- ✅ Error message extraction and storage

## Documentation Improvements

### Inline JSDoc Documentation
All public functions now have comprehensive JSDoc comments including:

#### Function Documentation Includes:
- **Purpose**: What the function does
- **Parameters**: Type, description, and purpose of each parameter
- **Returns**: Return type and what it contains
- **Throws**: What errors can be thrown and when
- **Remarks**: Important notes about usage, edge cases, or implementation details
- **Examples**: Usage examples where helpful

#### Files with Enhanced Documentation:

1. **`src/lib/llm-service.ts`**
   - `loadPromptTemplate()` - Documented fallback behavior
   - `retryWithBackoff()` - Documented exponential backoff strategy
   - `generateAnthropicSummary()` - Full API call documentation
   - `generateGeminiSummary()` - Full API call documentation
   - `generatePerplexitySummary()` - Full API call documentation
   - `generateSummaryForProvider()` - Routing and error handling
   - `generateAllSummaries()` - Parallel execution notes

2. **`src/lib/llm-config.ts`**
   - Module-level documentation explaining purpose
   - Interface documentation for `ProviderConfig`
   - Function documentation for all helpers
   - Type documentation for `LLMProviderKey`

3. **`src/lib/llm-api-helpers.ts`**
   - Module-level documentation
   - Error handling function documentation
   - Prompt building function documentation

4. **`src/lib/ai-summary-utils.ts`**
   - Utility function documentation
   - Constant documentation

5. **`src/app/api/ai-summary/route.ts`**
   - Route handler documentation
   - Request/response documentation
   - Validation logic documentation

6. **`src/hooks/useAISummary.ts`**
   - Hook documentation with return value details
   - Function documentation for all methods
   - Usage examples

7. **`src/components/features/AISummary.tsx`**
   - Component documentation
   - Props interface documentation
   - Usage notes

8. **`src/components/features/AISummaryCard.tsx`**
   - Component documentation
   - Props interface documentation
   - Rendering logic documentation

## Logging Examples

### Debug Mode Enabled (DEBUG=true)
```
[llm-service] DEBUG: Loading prompt template { promptPath: '/path/to/docs/prompt.md' }
[llm-service] INFO: Prompt template loaded successfully { length: 1234, path: '/path/to/docs/prompt.md' }
[llm-service] DEBUG: Generating Anthropic summary { model: 'claude-sonnet-4-20250514', transcriptLength: 5000, promptLength: 1234 }
[llm-service] DEBUG: Making Anthropic API request { endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514', promptLength: 6234 }
[llm-service] INFO: Anthropic summary generated successfully { contentLength: 1500, model: 'claude-sonnet-4-20250514' }
[ai-summary-api] DEBUG: Received AI summary request
[ai-summary-api] INFO: Starting summary generation { provider: 'anthropic', transcriptLength: 5000 }
[ai-summary-api] INFO: Summary generation completed { provider: 'anthropic', totalSummaries: 1, successfulCount: 1, failedCount: 0 }
```

### Debug Mode Disabled (DEBUG=false or unset)
```
[llm-service] ERROR: Anthropic API key not configured Error: ANTHROPIC_API_KEY is not configured { config: {...} }
[llm-service] ERROR: Error generating summary for provider Error: Invalid API key { provider: 'anthropic', modelName: 'Anthropic Sonnet 4.5', errorMessage: 'Invalid API key' }
[ai-summary-api] ERROR: AI summary generation failed Error: Failed to generate AI summary
```

## Error Context in Logs

All error logs include relevant context:
- Provider information
- Model names
- Request details (without sensitive data)
- Response status codes
- Error messages from APIs
- Stack traces for unexpected errors

## Benefits

1. **Easier Debugging**: DEBUG mode provides detailed insights into API calls and state changes
2. **Production Ready**: Warnings and errors always logged, debug logs only in development
3. **Better Error Messages**: User-friendly errors with technical details in logs
4. **Maintainability**: Comprehensive documentation makes code self-explanatory
5. **Consistency**: Follows same patterns as rest of codebase (ytdlp-service, etc.)

## Usage

To enable debug logging, set in `.env`:
```env
DEBUG=true
```

To disable (production):
```env
DEBUG=false
```

Or simply omit the variable (defaults to false).

