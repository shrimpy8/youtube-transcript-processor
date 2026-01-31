import { createSuccessResponse } from '@/lib/api-helpers'
import { getConfiguredProviders } from '@/lib/llm-config'

/**
 * GET /api/ai-summary/config
 * Returns which LLM providers have API keys configured (booleans only)
 */
export async function GET() {
  const providers = getConfiguredProviders()
  return createSuccessResponse({ providers })
}
