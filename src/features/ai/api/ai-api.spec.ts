import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AiDraftRequest } from '@/models/models'

import { AiApiError, requestAiDraft, saveAiSettings } from './ai-api'

const SETTINGS = {
  isEnabled: true,
  provider: 'openai',
  model: 'gpt-5.4-nano',
  hasApiKey: true,
  apiKeyHint: 'abcd',
} as const

afterEach(() => {
  vi.restoreAllMocks()
})

describe('saveAiSettings', () => {
  it('Given a valid answer, should return the settings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(SETTINGS))

    await expect(
      saveAiSettings({ isEnabled: true, provider: 'openai', model: 'gpt-5.4-nano' }),
    ).resolves.toEqual(SETTINGS)
  })

  it('Given a 422 with a reason, should throw an AiApiError carrying both', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ details: { reason: 'bad-model' } }, { status: 422 }),
    )

    const failure = await saveAiSettings({
      isEnabled: true,
      provider: 'openai',
      model: '',
    }).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AiApiError)
    expect(failure).toMatchObject({ status: 422, reason: 'bad-model' })
  })

  it('Given a malformed answer, should throw an AiApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ nope: true }))

    await expect(
      saveAiSettings({ isEnabled: false, provider: 'openai', model: '' }),
    ).rejects.toBeInstanceOf(AiApiError)
  })
})

describe('requestAiDraft', () => {
  const input: AiDraftRequest = {
    prompt: 'sunset',
    postType: 'photo',
    fields: ['title', 'text'],
    title: '',
    altText: 'A beach',
    text: '',
  }

  it('Given no file, should send form data without a file part and return the draft', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ title: 'Sunset' }))

    await expect(requestAiDraft(input)).resolves.toEqual({ title: 'Sunset' })

    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('/api/admin/ai/draft')
    const body = init?.body
    expect(body).toBeInstanceOf(FormData)
    if (body instanceof FormData) {
      expect(body.getAll('field')).toEqual(['title', 'text'])
      expect(body.has('file')).toBe(false)
      expect(body.get('prompt')).toBe('sunset')
    }
  })

  it('Given a file, should append it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}))
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })

    await requestAiDraft({ ...input, file })

    const body = fetchSpy.mock.calls[0]?.[1]?.body
    expect(body instanceof FormData && body.has('file')).toBe(true)
  })

  it('Given a 502 with a reason, should expose the reason', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ details: { reason: 'rate-limit' } }, { status: 502 }),
    )

    await expect(requestAiDraft(input)).rejects.toMatchObject({
      status: 502,
      reason: 'rate-limit',
    })
  })
})
