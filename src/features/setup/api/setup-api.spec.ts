import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  finalizeSetup,
  SetupApiError,
  fetchSetupState,
  saveSetupProfile,
  unlockSetup,
  uploadSetupPhoto,
} from './setup-api'

const mockFetch = (response: Response) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

const PROFILE = { name: 'Ada', description: 'Writer', hasPhoto: false }

describe('setup api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Given a valid state response, should decode the setup state with same-origin credentials', async () => {
    const state = { status: 'pending', isConfigured: true, isUnlocked: false, profile: null }
    const fetchSpy = mockFetch(Response.json(state))

    await expect(fetchSetupState()).resolves.toEqual(state)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/setup',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })

  it('Given a malformed state response, should throw a SetupApiError', async () => {
    mockFetch(Response.json({ status: 'weird' }))

    await expect(fetchSetupState()).rejects.toBeInstanceOf(SetupApiError)
  })

  it.each([401, 429, 503])(
    'Given a %i unlock response, should throw its status',
    async (status) => {
      mockFetch(new Response(null, { status }))

      await expect(unlockSetup({ password: 'wrong' })).rejects.toMatchObject({ status })
    },
  )

  it('Given a correct password, should post it as JSON and resolve on 204', async () => {
    const fetchSpy = mockFetch(new Response(null, { status: 204 }))

    await expect(unlockSetup({ password: 'right-password' })).resolves.toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/setup/unlock',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'right-password' }),
      }),
    )
  })

  it('Given a profile bundle, should put it and decode the saved profile', async () => {
    const fetchSpy = mockFetch(Response.json(PROFILE))

    await expect(saveSetupProfile({ name: 'Ada', description: 'Writer' })).resolves.toEqual(PROFILE)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/setup/profile',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('Given a photo file, should send it as multipart field file', async () => {
    const fetchSpy = mockFetch(Response.json({ ...PROFILE, hasPhoto: true }))
    const file = new File(['bytes'], 'me.png', { type: 'image/png' })

    await expect(uploadSetupPhoto(file)).resolves.toMatchObject({ hasPhoto: true })
    const init = fetchSpy.mock.calls[0]?.[1]
    expect(init?.body).toBeInstanceOf(FormData)
    expect(init?.body instanceof FormData && init.body.get('file')).toBeInstanceOf(File)
  })

  it.each([413, 422])('Given a %i photo response, should throw its status', async (status) => {
    mockFetch(new Response(null, { status }))

    await expect(uploadSetupPhoto(new File(['x'], 'a.png'))).rejects.toMatchObject({ status })
  })

  it('Given a finalize success, should return the redirect target', async () => {
    mockFetch(Response.json({ redirectTo: '/admin' }))

    await expect(
      finalizeSetup({
        identifier: 'owner',
        password: 'long-enough-password',
        passwordConfirmation: 'long-enough-password',
      }),
    ).resolves.toEqual({ redirectTo: '/admin' })
  })
})
