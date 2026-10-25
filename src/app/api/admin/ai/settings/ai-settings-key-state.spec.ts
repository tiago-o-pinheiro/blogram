// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, it } from 'vitest'

import { GET, PUT } from '@/app/api/admin/ai/settings/route'
import { db } from '@/server/lib/db'
import { aiSettings } from '@/server/modules/ai/schemas/ai.table'
import { createSecretBox } from '@/server/modules/ai/services/secret-box'
import { createOwnerSession } from '@/test/auth-session'

const URL = 'http://localhost:3000/api/admin/ai/settings'
const OTHER_SECRET = '::another-secret-of-at-least-thirty-two-chars::'

const sendPut = (body: unknown, cookie: string) =>
  new Request(URL, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  })

const sendGet = (cookie: string) => new Request(URL, { headers: { cookie } })

describe('ai settings key state', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
  })

  it('BH-1: Given a stored key sealed with another secret, should report no key and refuse to enable', async () => {
    await db.insert(aiSettings).values({
      id: 'singleton',
      isEnabled: false,
      provider: 'openai',
      model: 'gpt-5-nano',
      apiKeyCiphertext: createSecretBox(OTHER_SECRET).seal('sk-rotated-away-abcd'),
      apiKeyHint: 'abcd',
    })

    const read = await GET(sendGet(cookie))
    const enable = await PUT(
      sendPut({ isEnabled: true, provider: 'openai', model: 'gpt-5-nano' }, cookie),
    )

    expect(await read.json()).toMatchObject({ hasApiKey: false })
    expect(enable.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('BH-2: Given an API key of four characters or fewer, should never echo the whole key as the hint', async () => {
    const response = await PUT(
      sendPut({ isEnabled: true, provider: 'openai', model: 'gpt-5-nano', apiKey: 'abcd' }, cookie),
    )
    const text = await response.text()

    expect(response.status).toBe(StatusCodes.OK)
    expect(text).not.toContain('"apiKeyHint":"abcd"')
  })
})
