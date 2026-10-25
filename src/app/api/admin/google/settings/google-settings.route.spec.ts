// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, it } from 'vitest'

import { GET, PUT } from '@/app/api/admin/google/settings/route'
import { db } from '@/server/lib/db'
import { createSecretBox } from '@/server/lib/secret-box'
import { googleSignInSettings } from '@/server/modules/auth/schemas/google-settings.table'
import { createOwnerSession } from '@/test/auth-session'

const URL = 'http://localhost:3000/api/admin/google/settings'
const CLIENT_ID = 'abc123.apps.googleusercontent.com'
const CLIENT_SECRET = 'GOCSPX-plain-secret-value'
const OTHER_SECRET = '::another-secret-of-at-least-thirty-two-chars::'

const sendPut = (body: unknown, cookie?: string) =>
  new Request(URL, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })

const sendGet = (cookie?: string) => new Request(URL, { headers: cookie ? { cookie } : {} })

const enabledUpdate = { isEnabled: true, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }

describe('google settings routes', () => {
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

  it('Given no env and no stored row, should return the disabled defaults', async () => {
    const response = await GET(sendGet(cookie))
    const body = await response.json()

    expect(response.status).toBe(StatusCodes.OK)
    expect(body).toEqual({
      source: 'settings',
      isEnabled: false,
      clientId: '',
      hasClientSecret: false,
      redirectUri: expect.stringMatching(/\/api\/auth\/callback\/google$/),
    })
  })

  it('Given credentials, should save without echoing the secret and store ciphertext', async () => {
    const response = await PUT(sendPut(enabledUpdate, cookie))
    const text = await response.text()
    const [row] = await db.select().from(googleSignInSettings)

    expect(response.status).toBe(StatusCodes.OK)
    expect(JSON.parse(text)).toMatchObject({
      source: 'settings',
      isEnabled: true,
      clientId: CLIENT_ID,
      hasClientSecret: true,
    })
    expect(text).not.toContain(CLIENT_SECRET)
    expect(row?.clientSecretCiphertext).toBeTruthy()
    expect(row?.clientSecretCiphertext).not.toContain(CLIENT_SECRET)
  })

  it('Given enabling with an empty client id, should answer 422', async () => {
    const response = await PUT(sendPut({ ...enabledUpdate, clientId: '' }, cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given enabling with no stored or sent secret, should answer 422', async () => {
    const response = await PUT(sendPut({ isEnabled: true, clientId: CLIENT_ID }, cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given a changed client id without a new secret, should answer 422 and keep the settings', async () => {
    await PUT(sendPut(enabledUpdate, cookie))

    const response = await PUT(sendPut({ isEnabled: true, clientId: 'other-id' }, cookie))
    const read = await GET(sendGet(cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(await read.json()).toMatchObject({ clientId: CLIENT_ID })
  })

  it('Given a save without clientSecret, should keep the stored secret', async () => {
    await PUT(sendPut(enabledUpdate, cookie))
    const [before] = await db.select().from(googleSignInSettings)

    const response = await PUT(sendPut({ isEnabled: false, clientId: CLIENT_ID }, cookie))
    const [after] = await db.select().from(googleSignInSettings)

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toMatchObject({ isEnabled: false, hasClientSecret: true })
    expect(after?.clientSecretCiphertext).toBe(before?.clientSecretCiphertext)
  })

  it('Given a secret sealed with another auth secret, should count it as absent', async () => {
    await db.insert(googleSignInSettings).values({
      id: 'singleton',
      isEnabled: false,
      clientId: CLIENT_ID,
      clientSecretCiphertext: createSecretBox(OTHER_SECRET).seal(CLIENT_SECRET),
    })

    const read = await GET(sendGet(cookie))
    const enable = await PUT(sendPut({ isEnabled: true, clientId: CLIENT_ID }, cookie))

    expect(await read.json()).toMatchObject({ hasClientSecret: false })
    expect(enable.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })
})
