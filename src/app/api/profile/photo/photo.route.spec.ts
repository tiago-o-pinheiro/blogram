// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { GET as GET_PHOTO } from '@/app/api/profile/photo/route'
import { POST as POST_FINALIZE } from '@/app/api/setup/finalize/route'
import { POST as POST_PHOTO } from '@/app/api/setup/profile/photo/route'
import { PUT as PUT_PROFILE } from '@/app/api/setup/profile/route'
import { GET as GET_STATE } from '@/app/api/setup/route'
import { createPng } from '@/test/image-fixtures'
import { createSetupCookie } from '@/test/setup-session'

const BASE_URL = 'http://localhost:3000/api'
const OWNER = {
  identifier: 'owner@example.test',
  password: '::password::-12345',
  passwordConfirmation: '::password::-12345',
}

const getPhoto = (cookie?: string) =>
  GET_PHOTO(new Request(`${BASE_URL}/profile/photo`, cookie ? { headers: { cookie } } : undefined))

const getState = (cookie?: string) =>
  GET_STATE(new Request(`${BASE_URL}/setup`, cookie ? { headers: { cookie } } : undefined))

const saveDraft = async (cookie: string) => {
  await PUT_PROFILE(
    new Request(`${BASE_URL}/setup/profile`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada', description: 'Writer' }),
    }),
  )
  const form = new FormData()
  form.set('file', new File([new Uint8Array(await createPng())], 'a.png', { type: 'image/png' }))
  return POST_PHOTO(
    new Request(`${BASE_URL}/setup/profile/photo`, {
      method: 'POST',
      headers: { cookie },
      body: form,
    }),
  )
}

const finalize = (cookie: string) =>
  POST_FINALIZE(
    new Request(`${BASE_URL}/setup/finalize`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(OWNER),
    }),
  )

describe('profile photo route', () => {
  it('Given a fresh database, should report pending state with no profile', async () => {
    const response = await getState()

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toMatchObject({
      status: 'pending',
      isUnlocked: false,
      profile: null,
    })
  })

  it('Given a pending installation without a setup session, should respond 404', async () => {
    const response = await getPhoto()

    expect(response.status).toBe(StatusCodes.NOT_FOUND)
  })

  it('Given a pending installation and a setup session but no photo, should respond 404', async () => {
    const cookie = await createSetupCookie()

    const response = await getPhoto(cookie)

    expect(response.status).toBe(StatusCodes.NOT_FOUND)
  })

  it('Given an uploaded photo while pending, should serve it only with the setup session and return the draft in the state', async () => {
    const cookie = await createSetupCookie()
    expect((await saveDraft(cookie)).status).toBe(StatusCodes.OK)

    const withSession = await getPhoto(cookie)
    const withoutSession = await getPhoto()
    const state = await (await getState(cookie)).json()

    expect(withSession.status).toBe(StatusCodes.OK)
    expect(withSession.headers.get('content-type')).toBe('image/webp')
    expect(withoutSession.status).toBe(StatusCodes.NOT_FOUND)
    expect(state).toMatchObject({
      isUnlocked: true,
      profile: { name: 'Ada', description: 'Writer', hasPhoto: true },
    })
  })

  it('Given a completed installation, should serve the photo bytes publicly', async () => {
    const cookie = await createSetupCookie()
    await saveDraft(cookie)
    expect((await finalize(cookie)).status).toBe(StatusCodes.OK)

    const response = await getPhoto()
    const bytes = new Uint8Array(await response.arrayBuffer())

    expect(response.status).toBe(StatusCodes.OK)
    expect(response.headers.get('content-type')).toBe('image/webp')
    expect(bytes.length).toBeGreaterThan(0)
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF')
  })
})
