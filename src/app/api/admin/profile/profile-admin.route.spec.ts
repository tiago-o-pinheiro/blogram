// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, it } from 'vitest'

import { POST as POST_PHOTO } from '@/app/api/admin/profile/photo/route'
import { PUT as PUT_PROFILE } from '@/app/api/admin/profile/route'
import { GET as GET_SETTINGS, PUT as PUT_SETTINGS } from '@/app/api/admin/settings/route'
import { db } from '@/server/lib/db'
import { storage } from '@/server/lib/storage'
import { profile } from '@/server/modules/profile/schemas/profile.table'
import { createOwnerSession } from '@/test/auth-session'
import { createJpegWithGps, createPng, createTextAsJpg } from '@/test/image-fixtures'

const BASE_URL = 'http://localhost:3000/api/admin'

const sendJson = (path: string, method: string, body: unknown, cookie?: string) =>
  new Request(`${BASE_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })

const sendPhoto = (file: File | null, cookie?: string) => {
  const form = new FormData()
  if (file) {
    form.set('file', file)
  }
  return new Request(`${BASE_URL}/profile/photo`, {
    method: 'POST',
    headers: cookie ? { cookie } : {},
    body: form,
  })
}

const toFile = (data: Buffer, name: string, type: string) =>
  new File([new Uint8Array(data)], name, { type })

const readPhotoKey = async () => {
  const [row] = await db.select({ photoKey: profile.photoKey }).from(profile)
  return row?.photoKey ?? null
}

describe('profile admin routes', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
  })

  it('Given no session, should answer 401 on every profile and settings route', async () => {
    const responses = await Promise.all([
      PUT_PROFILE(sendJson('/profile', 'PUT', { name: 'Ada', description: '' })),
      POST_PHOTO(sendPhoto(toFile(await createPng(), 'a.png', 'image/png'))),
      GET_SETTINGS(new Request(`${BASE_URL}/settings`)),
      PUT_SETTINGS(sendJson('/settings', 'PUT', { defaultLocale: 'es' })),
    ])

    expect(responses.map((response) => response.status)).toEqual([
      StatusCodes.UNAUTHORIZED,
      StatusCodes.UNAUTHORIZED,
      StatusCodes.UNAUTHORIZED,
      StatusCodes.UNAUTHORIZED,
    ])
  })

  it('Given a valid body, should persist name and description', async () => {
    const response = await PUT_PROFILE(
      sendJson('/profile', 'PUT', { name: 'Ada', description: 'Writer' }, cookie),
    )

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({ name: 'Ada', description: 'Writer', hasPhoto: false })
  })

  it('Given an invalid body, should answer 422', async () => {
    const response = await PUT_PROFILE(sendJson('/profile', 'PUT', { name: 42 }, cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given a bad image, should answer 422 and keep the profile without a photo', async () => {
    const response = await POST_PHOTO(
      sendPhoto(toFile(createTextAsJpg(), 'a.jpg', 'image/jpeg'), cookie),
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(await readPhotoKey()).toBeNull()
  })

  it('Given a missing file, should answer 422', async () => {
    const response = await POST_PHOTO(sendPhoto(null, cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given a second photo, should delete the previous stored object', async () => {
    await PUT_PROFILE(sendJson('/profile', 'PUT', { name: 'Ada', description: '' }, cookie))
    await POST_PHOTO(sendPhoto(toFile(await createPng(), 'a.png', 'image/png'), cookie))
    const previousKey = await readPhotoKey()

    const response = await POST_PHOTO(
      sendPhoto(toFile(await createJpegWithGps(), 'b.jpg', 'image/jpeg'), cookie),
    )

    const currentKey = await readPhotoKey()
    expect(response.status).toBe(StatusCodes.OK)
    expect(previousKey).not.toBeNull()
    expect(currentKey).not.toBe(previousKey)
    expect(previousKey && (await storage.get(previousKey))).toBeNull()
    expect(currentKey && (await storage.get(currentKey))).not.toBeNull()
  })

  it('Given saved settings, should return them on the next read', async () => {
    const saved = await PUT_SETTINGS(sendJson('/settings', 'PUT', { defaultLocale: 'es' }, cookie))
    const read = await GET_SETTINGS(new Request(`${BASE_URL}/settings`, { headers: { cookie } }))

    expect(saved.status).toBe(StatusCodes.OK)
    expect(await read.json()).toEqual({ defaultLocale: 'es' })
  })

  it('Given an unsupported language, should answer 422 and keep the previous value', async () => {
    const response = await PUT_SETTINGS(
      sendJson('/settings', 'PUT', { defaultLocale: 'fr' }, cookie),
    )
    const read = await GET_SETTINGS(new Request(`${BASE_URL}/settings`, { headers: { cookie } }))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(await read.json()).toEqual({ defaultLocale: 'en' })
  })
})
