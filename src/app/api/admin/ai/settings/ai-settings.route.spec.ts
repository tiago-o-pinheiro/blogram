// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, it } from 'vitest'

import { GET, PUT } from '@/app/api/admin/ai/settings/route'
import { db } from '@/server/lib/db'
import { aiSettings } from '@/server/modules/ai/schemas/ai.table'
import { aiSettingsService } from '@/server/modules/ai/services/ai-settings.service'
import { createOwnerSession } from '@/test/auth-session'

const URL = 'http://localhost:3000/api/admin/ai/settings'
const API_KEY = 'sk-test-secret-abcd'

const sendPut = (body: unknown, cookie?: string) =>
  new Request(URL, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })

const sendGet = (cookie?: string) => new Request(URL, { headers: cookie ? { cookie } : {} })

const enabledUpdate = { isEnabled: true, provider: 'openai', model: 'gpt-5-nano', apiKey: API_KEY }

describe('ai settings routes', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
  })

  it('Given no session, should answer 401 on get and put', async () => {
    const responses = await Promise.all([GET(sendGet()), PUT(sendPut(enabledUpdate))])

    expect(responses.map((response) => response.status)).toEqual([
      StatusCodes.UNAUTHORIZED,
      StatusCodes.UNAUTHORIZED,
    ])
  })

  it('Given no saved row, should return the disabled defaults', async () => {
    const response = await GET(sendGet(cookie))

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({
      isEnabled: false,
      provider: 'openai',
      model: 'gpt-5.4-nano',
      hasApiKey: false,
      apiKeyHint: '',
    })
  })

  it('Given a provider, model and key, should save and answer the hint but never the key', async () => {
    const response = await PUT(sendPut(enabledUpdate, cookie))
    const text = await response.text()

    expect(response.status).toBe(StatusCodes.OK)
    expect(JSON.parse(text)).toEqual({
      isEnabled: true,
      provider: 'openai',
      model: 'gpt-5-nano',
      hasApiKey: true,
      apiKeyHint: 'abcd',
    })
    expect(text).not.toContain(API_KEY)
  })

  it('Given a save without apiKey, should keep the stored key and never store plaintext', async () => {
    await PUT(sendPut(enabledUpdate, cookie))

    const response = await PUT(
      sendPut({ isEnabled: true, provider: 'openai', model: 'gpt-5-mini' }, cookie),
    )
    const [row] = await db.select().from(aiSettings)

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toMatchObject({ model: 'gpt-5-mini', hasApiKey: true })
    expect(row?.apiKeyCiphertext).toBeTruthy()
    expect(row?.apiKeyCiphertext).not.toContain(API_KEY)
    expect((await aiSettingsService.readCredentials()).apiKey).toBe(API_KEY)
  })

  it('Given enabling without a key, should answer 422', async () => {
    const response = await PUT(
      sendPut({ isEnabled: true, provider: 'openai', model: 'gpt-5-nano' }, cookie),
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given enabling with an empty model, should answer 422', async () => {
    const response = await PUT(sendPut({ ...enabledUpdate, model: '' }, cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given a provider switch without a new key, should answer 422 and keep the settings', async () => {
    await PUT(sendPut(enabledUpdate, cookie))

    const response = await PUT(
      sendPut({ isEnabled: true, provider: 'anthropic', model: 'claude-haiku-4-5' }, cookie),
    )
    const read = await GET(sendGet(cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(await read.json()).toMatchObject({ provider: 'openai', model: 'gpt-5-nano' })
  })

  it('Given AI disabled, should refuse credentials with ai-not-configured', async () => {
    await PUT(sendPut(enabledUpdate, cookie))
    await PUT(sendPut({ ...enabledUpdate, isEnabled: false, apiKey: undefined }, cookie))

    await expect(aiSettingsService.readCredentials()).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
      details: { reason: 'ai-not-configured' },
    })
  })

  it('Given a key sealed with another secret, should refuse credentials with ai-not-configured', async () => {
    await PUT(sendPut(enabledUpdate, cookie))
    await db.update(aiSettings).set({ apiKeyCiphertext: 'v1.broken.broken.broken' })

    await expect(aiSettingsService.readCredentials()).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
      details: { reason: 'ai-not-configured' },
    })
  })
})
