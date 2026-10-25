// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/admin/ai/draft/route'
import { hasAiContext, toAiDraftRequest } from '@/features/ai/lib/to-ai-draft-request'
import { aiSettingsService } from '@/server/modules/ai/services/ai-settings.service'
import { createOwnerSession } from '@/test/auth-session'
import { createJpegWithGps } from '@/test/image-fixtures'

const URL = 'http://localhost:3000/api/admin/ai/draft'

const providerAnswer = () =>
  new Response(JSON.stringify({ choices: [{ message: { content: '{"text":"A caption"}' } }] }), {
    status: StatusCodes.OK,
    headers: { 'content-type': 'application/json' },
  })

describe('ai draft for a link post with a cover', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
    await aiSettingsService.saveSettings({
      isEnabled: true,
      provider: 'openai',
      model: 'gpt-5-nano',
      apiKey: 'sk-test-secret-abcd',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('BH-3: Given a link post with only a cover image, should accept the caption request the client enables', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => providerAnswer())
    const cover = new File([new Uint8Array(await createJpegWithGps())], 'cover.jpg', {
      type: 'image/jpeg',
    })
    const values = { title: '', altText: '', text: '' }
    const request = toAiDraftRequest({
      target: 'text',
      prompt: '',
      postType: 'link',
      values,
      image: { file: cover },
    })
    const form = new FormData()
    form.set('prompt', request.prompt)
    form.set('postType', request.postType)
    request.fields.forEach((field) => form.append('field', field))
    form.set('title', request.title)
    form.set('altText', request.altText)
    form.set('text', request.text)
    if (request.file) {
      form.set('file', request.file)
    }

    expect(hasAiContext('', true, values)).toBe(true)
    const response = await POST(
      new Request(URL, { method: 'POST', headers: { cookie }, body: form }),
    )

    expect(response.status).toBe(StatusCodes.OK)
  })
})
