import { createSuccessResponse } from '@/lib/api-helpers'
import { getConfiguredProviders } from '@/lib/llm-config'

/**
 * GET /api/ai-summary/config
 * Returns which LLM providers have API keys configured (booleans only)
 */
/**
 * @swagger
 * /api/ai-summary/config:
 *   get:
 *     summary: Get configured AI providers
 *     description: Returns which LLM providers have API keys configured. No secrets are exposed — only boolean availability flags.
 *     tags:
 *       - AI Summary
 *     responses:
 *       200:
 *         description: Provider availability
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 providers:
 *                   type: object
 *                   properties:
 *                     anthropic:
 *                       type: boolean
 *                     google-gemini:
 *                       type: boolean
 *                     perplexity:
 *                       type: boolean
 */
export async function GET() {
  const providers = getConfiguredProviders()
  return createSuccessResponse({ providers })
}
