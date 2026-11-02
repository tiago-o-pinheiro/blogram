import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Models } from '@/models'

import { aiSettingsService } from '@/server/modules/ai/services/ai-settings.service'
import {
  AI_MAX_OUTPUT_TOKENS,
  AiWriterService,
} from '@/server/modules/ai/services/ai-writer.service'

const toInput = (overrides: Partial<Models.AiDraftRequest> = {}): Models.AiDraftRequest => ({
  postType: 'news',
  fields: ['text'],
  title: '::context title::',
  altText: '',
  text: '::draft::',
  ...overrides,
})

const createFetcher = () =>
  vi.fn<typeof fetch>(async () =>
    Response.json({
      choices: [
        { message: { content: JSON.stringify({ text: '::improved::', title: '::ignored::' }) } },
      ],
    }),
  )

const readBody = (fetcher: ReturnType<typeof createFetcher>, index = 0): unknown => {
  const body = fetcher.mock.calls[index]?.[1]?.body
  return typeof body === 'string' ? JSON.parse(body) : null
}

describe('AiWriterService', () => {
  beforeEach(async () => {
    await aiSettingsService.saveSettings({
      isEnabled: true,
      provider: 'openai',
      model: 'gpt-5-nano',
      apiKey: '::key::',
    })
  })

  it('Given a field draft, should improve only its requested target', async () => {
    const fetcher = createFetcher()
    const service = new AiWriterService({ fetcher })

    const draft = await service.draft(toInput({ text: 'foto en la playa, algo poetico' }))

    expect(draft).toEqual({ text: '::improved::' })
    expect(JSON.stringify(readBody(fetcher))).toContain('draft or instructions')
    expect(JSON.stringify(readBody(fetcher))).toContain('context only')
    expect(JSON.stringify(readBody(fetcher))).toContain('foto en la playa, algo poetico')
    expect(JSON.stringify(readBody(fetcher))).toContain(
      "Keep the author's facts, meaning, detail and language",
    )
  })

  it('Given a long caption draft, should raise its output budget within the cap', async () => {
    const fetcher = createFetcher()
    const service = new AiWriterService({ fetcher })
    await service.draft(toInput())
    await service.draft(toInput({ text: 'a'.repeat(Models.POST_TEXT_MAX) }))
    const shortBody = readBody(fetcher)
    const longBody = readBody(fetcher, 1)

    expect(shortBody).toMatchObject({ max_completion_tokens: 728 })
    expect(longBody).toMatchObject({ max_completion_tokens: 128 + Models.POST_TEXT_MAX * 2 })
    expect(128 + Models.POST_TEXT_MAX * 2).toBeLessThanOrEqual(AI_MAX_OUTPUT_TOKENS)
  })

  it('Given no drafts or image, should reject an empty request', async () => {
    const fetcher = createFetcher()
    const service = new AiWriterService({ fetcher })

    await expect(service.draft(toInput({ text: '', title: '' }))).rejects.toMatchObject({
      statusCode: 422,
    })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
