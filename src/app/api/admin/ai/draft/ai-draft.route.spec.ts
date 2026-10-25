// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Models } from '@/models'

import { POST } from '@/app/api/admin/ai/draft/route'
import { POST as POST_POST } from '@/app/api/admin/posts/route'
import { decode } from '@/server/lib/codec'
import { aiSettingsService } from '@/server/modules/ai/services/ai-settings.service'
import { createOwnerSession } from '@/test/auth-session'
import { createJpegWithGps } from '@/test/image-fixtures'

const URL = 'http://localhost:3000/api/admin/ai/draft'
const API_KEY = 'sk-test-secret-abcd'

const jsonResponse = (content: string, status = StatusCodes.OK) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const createImage = async () =>
  new File([new Uint8Array(await createJpegWithGps())], 'a.jpg', { type: 'image/jpeg' })

const sendDraft = (fields: Record<string, string | readonly string[] | File>, cookie?: string) => {
  const form = new FormData()
  Object.entries(fields).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => form.append(name, item))
      return
    }
    if (typeof value === 'string' || value instanceof File) {
      form.set(name, value)
    }
  })
  return new Request(URL, { method: 'POST', headers: cookie ? { cookie } : {}, body: form })
}

const baseFields = {
  prompt: 'Sunset in Lisbon',
  postType: 'photo',
  title: '',
  altText: '',
  text: '',
}

const readProviderBody = (spy: ReturnType<typeof spyOnFetch>) => {
  const [, init] = spy.mock.calls[0] ?? []
  return typeof init?.body === 'string' ? JSON.parse(init.body) : null
}

const spyOnFetch = (content: string, status = StatusCodes.OK) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse(content, status))

describe('ai draft route', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
    await aiSettingsService.saveSettings({
      isEnabled: true,
      provider: 'openai',
      model: 'gpt-5-nano',
      apiKey: API_KEY,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Given no session, should answer 401 and never call the provider', async () => {
    const spy = spyOnFetch('{}')

    const response = await POST(sendDraft({ ...baseFields, field: ['text'] }))

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
    expect(spy).not.toHaveBeenCalled()
  })

  it('Given a title request with existing alt text, should send no image and cap output tokens', async () => {
    const spy = spyOnFetch('{"title":"  Lisbon glow  ","text":"dropped"}')

    const response = await POST(
      sendDraft(
        {
          ...baseFields,
          altText: 'A sunset over rooftops',
          field: ['title'],
          file: await createImage(),
        },
        cookie,
      ),
    )

    const sent = readProviderBody(spy)
    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({ title: 'Lisbon glow' })
    expect(JSON.stringify(sent)).not.toContain('image_url')
    expect(JSON.stringify(sent)).not.toContain(API_KEY)
    expect(sent.max_completion_tokens).toBe(72)
  })

  it('Given a photo post with empty alt text, should attach one small low-detail image', async () => {
    const spy = spyOnFetch('{"title":"Hi","text":"Warm light."}')

    const response = await POST(
      sendDraft({ ...baseFields, field: ['title', 'text'], file: await createImage() }, cookie),
    )

    const sent = readProviderBody(spy)
    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({ title: 'Hi', text: 'Warm light.' })
    expect(JSON.stringify(sent)).toContain('data:image/jpeg;base64,')
    expect(JSON.stringify(sent)).toContain('"detail":"low"')
    expect(sent.max_completion_tokens).toBe(672)
  })

  it('Given a saved image id, should read it from storage and attach it for alt text', async () => {
    const form = new FormData()
    form.set('type', 'photo')
    form.set('file', await createImage())
    const created = await POST_POST(
      new Request('http://localhost:3000/api/admin/posts', {
        method: 'POST',
        headers: { cookie },
        body: form,
      }),
    )
    const saved = decode(Models.Post, await created.json())
    const spy = spyOnFetch('{"altText":"A red square"}')

    const response = await POST(
      sendDraft({ ...baseFields, field: ['altText'], mediaId: saved.image?.id ?? '' }, cookie),
    )

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({ altText: 'A red square' })
    expect(JSON.stringify(readProviderBody(spy))).toContain('data:image/jpeg;base64,')
  })

  it('Given alt text without any image, should answer 422', async () => {
    const spy = spyOnFetch('{"altText":"x"}')

    const response = await POST(sendDraft({ ...baseFields, field: ['altText'] }, cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(spy).not.toHaveBeenCalled()
  })

  it('Given no prompt, no image and empty values, should answer 422', async () => {
    const spy = spyOnFetch('{"text":"x"}')

    const response = await POST(
      sendDraft({ ...baseFields, prompt: ' ', postType: 'youtube', field: ['text'] }, cookie),
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(spy).not.toHaveBeenCalled()
  })

  it('Given an unreadable image, should answer 422', async () => {
    spyOnFetch('{"altText":"x"}')

    const response = await POST(
      sendDraft(
        {
          ...baseFields,
          field: ['altText'],
          file: new File(['not an image'], 'a.jpg', { type: 'image/jpeg' }),
        },
        cookie,
      ),
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given a fenced answer with an unusable key, should keep only the usable requested keys', async () => {
    spyOnFetch('```json\n{"title":"","text":"A caption."}\n```')

    const response = await POST(sendDraft({ ...baseFields, field: ['title', 'text'] }, cookie))

    expect(await response.json()).toEqual({ text: 'A caption.' })
  })

  it('Given an answer with no usable field, should answer 502 invalid-response', async () => {
    spyOnFetch('not json')

    const response = await POST(sendDraft({ ...baseFields, field: ['text'] }, cookie))

    expect(response.status).toBe(StatusCodes.BAD_GATEWAY)
    expect((await response.json()).details).toEqual({ reason: 'invalid-response' })
  })

  it('Given a provider 401, should answer 502 with the auth reason', async () => {
    spyOnFetch('{}', StatusCodes.UNAUTHORIZED)

    const response = await POST(sendDraft({ ...baseFields, field: ['text'] }, cookie))

    expect(response.status).toBe(StatusCodes.BAD_GATEWAY)
    expect((await response.json()).details).toEqual({ reason: 'auth' })
  })

  it('Given settings without a key, should answer 409 ai-not-configured', async () => {
    await aiSettingsService.saveSettings({ isEnabled: false, provider: 'openai', model: '' })
    const spy = spyOnFetch('{}')

    const response = await POST(sendDraft({ ...baseFields, field: ['text'] }, cookie))

    expect(response.status).toBe(StatusCodes.CONFLICT)
    expect(spy).not.toHaveBeenCalled()
  })
})
