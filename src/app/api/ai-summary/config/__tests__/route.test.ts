import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/llm-config', () => ({
  getConfiguredProviders: vi.fn(),
}))

import { GET } from '../route'
import { getConfiguredProviders } from '@/lib/llm-config'

describe('GET /api/ai-summary/config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns configured provider flags', async () => {
    vi.mocked(getConfiguredProviders).mockReturnValue({
      anthropic: true,
      'google-gemini': false,
      perplexity: true,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.providers).toEqual({
      anthropic: true,
      'google-gemini': false,
      perplexity: true,
    })
  })

  it('returns all false when no providers configured', async () => {
    vi.mocked(getConfiguredProviders).mockReturnValue({
      anthropic: false,
      'google-gemini': false,
      perplexity: false,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.providers.anthropic).toBe(false)
    expect(json.providers['google-gemini']).toBe(false)
    expect(json.providers.perplexity).toBe(false)
  })

  it('returns all true when all providers configured', async () => {
    vi.mocked(getConfiguredProviders).mockReturnValue({
      anthropic: true,
      'google-gemini': true,
      perplexity: true,
    })

    const res = await GET()
    const json = await res.json()
    expect(json.providers.anthropic).toBe(true)
    expect(json.providers['google-gemini']).toBe(true)
    expect(json.providers.perplexity).toBe(true)
  })
})
