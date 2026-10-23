// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NotFoundError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { createStorageKey } from '@/server/lib/storage'
import { createLocalDriver } from '@/server/lib/storage/local-driver'
import { authService } from '@/server/modules/auth/services/auth.service'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { MediaService } from '@/server/modules/media/services/media.service'
import { ProfileService } from '@/server/modules/profile/services/profile.service'
import { createJpegWithGps } from '@/test/image-fixtures'

const MAX_BYTES = 5_000_000
const BYTES = new Uint8Array([1, 2, 3])

describe('ProfileService', () => {
  let directory: string
  let driver: ReturnType<typeof createLocalDriver>
  let service: ProfileService

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'blogram-profile-'))
    driver = createLocalDriver(directory)
    service = new ProfileService({ storage: driver })
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  const completeInstallation = () =>
    db.transaction(async (tx) => {
      const { id } = await authService.createOwner(tx, {
        identifier: 'owner@example.test',
        password: '::owner-password::-12345',
      })
      await installationService.completeInstallation(tx, id)
    })

  const storePhoto = async () => {
    const key = createStorageKey('profile', 'webp')
    await driver.put(key, BYTES, 'image/webp')
    await service.setPhoto(key, 'image/webp')
    return key
  }

  const createPhotoFile = async () =>
    new File([new Uint8Array(await createJpegWithGps())], 'photo.jpg', { type: 'image/jpeg' })

  const createMediaService = () =>
    new MediaService({ storage: driver, getMaxBytes: () => MAX_BYTES })

  it('Given no row, should default the site language to en', async () => {
    expect(await service.getSettings()).toEqual({ defaultLocale: 'en' })
  })

  it('Given saved settings, should upsert without a profile row and update on re-save', async () => {
    await service.saveSettings({ defaultLocale: 'es' })
    expect(await service.getSettings()).toEqual({ defaultLocale: 'es' })

    await service.saveSettings({ defaultLocale: 'en' })

    expect(await service.getSettings()).toEqual({ defaultLocale: 'en' })
  })

  it('Given a new photo over an old one, should store it and delete the previous object', async () => {
    const replacing = new ProfileService({ storage: driver, media: createMediaService() })
    await replacing.saveProfile({ name: 'Ada', description: '' })
    const previousKey = await storePhoto()

    const saved = await replacing.replacePhoto(await createPhotoFile())

    expect(saved.hasPhoto).toBe(true)
    expect(await driver.get(previousKey)).toBeNull()
    expect((await replacing.readPhoto({ hasSetupSession: true })).contentType).toBe('image/webp')
  })

  it('Given an invalid image, should reject and keep the previous photo', async () => {
    const replacing = new ProfileService({ storage: driver, media: createMediaService() })
    await replacing.saveProfile({ name: 'Ada', description: '' })
    const previousKey = await storePhoto()

    await expect(
      replacing.replacePhoto(new File([BYTES], 'bad.jpg', { type: 'image/jpeg' })),
    ).rejects.toBeInstanceOf(ValidationError)

    expect(await driver.get(previousKey)).not.toBeNull()
  })

  it('Given no row, should return a null profile', async () => {
    expect(await service.getProfile()).toBeNull()
  })

  it('Given a saved bundle, should return it without photo and update on re-save', async () => {
    await service.saveProfile({ name: 'Ada', description: 'Hello' })
    const updated = await service.saveProfile({ name: 'Ada L', description: '' })

    expect(updated).toEqual({ name: 'Ada L', description: '', hasPhoto: false })
  })

  it('Given a photo, should report hasPhoto and return the previous key on replacement', async () => {
    await service.saveProfile({ name: 'Ada', description: '' })
    const first = await storePhoto()

    expect((await service.getProfile())?.hasPhoto).toBe(true)
    const second = createStorageKey('profile', 'webp')
    expect(await service.setPhoto(second, 'image/webp')).toBe(first)
  })

  it('Given pending without a setup session, should throw NotFoundError', async () => {
    await service.saveProfile({ name: 'Ada', description: '' })
    await storePhoto()

    await expect(service.readPhoto({ hasSetupSession: false })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('Given pending with a setup session, should return the photo bytes', async () => {
    await service.saveProfile({ name: 'Ada', description: '' })
    await storePhoto()

    const photo = await service.readPhoto({ hasSetupSession: true })

    expect(photo.body).toEqual(BYTES)
    expect(photo.contentType).toBe('image/webp')
  })

  it('Given a completed installation, should serve the photo publicly', async () => {
    await service.saveProfile({ name: 'Ada', description: '' })
    await storePhoto()
    await completeInstallation()

    const photo = await service.readPhoto({ hasSetupSession: false })

    expect(photo.size).toBe(BYTES.byteLength)
  })

  it('Given a completed installation without a photo, should throw NotFoundError', async () => {
    await service.saveProfile({ name: 'Ada', description: '' })
    await completeInstallation()

    await expect(service.readPhoto({ hasSetupSession: false })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('Given a service restart, should still return the saved draft', async () => {
    await service.saveProfile({ name: 'Ada', description: 'Draft' })
    await storePhoto()
    vi.resetModules()

    const { ProfileService: Restarted } =
      await import('@/server/modules/profile/services/profile.service')
    const restarted = new Restarted({ storage: driver })
    const restartedDb = await import('@/server/lib/db')

    try {
      expect(await restarted.getProfile()).toEqual({
        name: 'Ada',
        description: 'Draft',
        hasPhoto: true,
      })
    } finally {
      await restartedDb.db.$client.end()
      await db.$client.end()
      vi.resetModules()
    }
  })
})
