// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { count } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ForbiddenError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { createLocalDriver } from '@/server/lib/storage/local-driver'
import { user } from '@/server/modules/auth/schemas/auth.table'
import { authService } from '@/server/modules/auth/services/auth.service'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { MediaService } from '@/server/modules/media/services/media.service'
import { ProfileService } from '@/server/modules/profile/services/profile.service'
import { SetupAuthService } from '@/server/modules/setup/services/setup-auth.service'
import { SetupSessionService } from '@/server/modules/setup/services/setup-session.service'
import { SetupService } from '@/server/modules/setup/services/setup.service'
import { createPng, createTextAsJpg } from '@/test/image-fixtures'

const PASSWORD = '::owner-password::-12345'
const SETUP_PASSWORD = '::setup-password::'

const OWNER = {
  identifier: 'owner@example.test',
  password: PASSWORD,
  passwordConfirmation: PASSWORD,
}

describe('SetupService', () => {
  let directory: string
  let sessions: SetupSessionService
  let profiles: ProfileService
  let service: SetupService

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'blogram-setup-'))
    const driver = createLocalDriver(directory)
    sessions = new SetupSessionService(() => new Date(), false)
    profiles = new ProfileService({ storage: driver })
    service = new SetupService({
      installation: installationService,
      profiles,
      sessions,
      setupAuth: new SetupAuthService(() => SETUP_PASSWORD),
      media: new MediaService({ storage: driver, getMaxBytes: () => 1_000_000 }),
      owners: authService,
    })
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  const countUsers = async () => {
    const [row] = await db.select({ total: count() }).from(user)
    return row?.total
  }

  const toCookieHeaders = async () => {
    const { token } = await sessions.create()
    return new Headers({ cookie: `blogram_setup=${token}` })
  }

  describe('resolveEntry', () => {
    it('Given pending without a session, should resolve unlock', async () => {
      expect(await service.resolveEntry(new Headers())).toBe('unlock')
    })

    it('Given pending with a setup session, should resolve wizard', async () => {
      expect(await service.resolveEntry(await toCookieHeaders())).toBe('wizard')
    })

    it('Given an unconfigured setup password, should resolve installer-error', async () => {
      const unconfigured = new SetupService({
        installation: installationService,
        profiles,
        sessions,
        setupAuth: new SetupAuthService(() => undefined),
        media: new MediaService({ storage: createLocalDriver(directory), getMaxBytes: () => 1 }),
        owners: authService,
      })

      expect(await unconfigured.resolveEntry(new Headers())).toBe('installer-error')
    })

    it('Given a completed installation, should resolve completed', async () => {
      await service.saveProfile({ name: 'Ada', description: '' })
      await service.finalize(OWNER)

      expect(await service.resolveEntry(new Headers())).toBe('completed')
    })
  })

  describe('getState', () => {
    it('Given a saved draft and a session, should return the unlocked draft state', async () => {
      await service.saveProfile({ name: 'Ada', description: 'Hi' })

      const state = await service.getState(await toCookieHeaders())

      expect(state).toEqual({
        status: 'pending',
        isConfigured: true,
        isUnlocked: true,
        profile: { name: 'Ada', description: 'Hi', hasPhoto: false },
      })
    })

    it('Given no session, should report locked with no profile', async () => {
      const state = await service.getState(new Headers())

      expect(state.isUnlocked).toBe(false)
      expect(state.profile).toBeNull()
    })
  })

  describe('uploadPhoto', () => {
    it('Given a png, should mark the profile as having a photo', async () => {
      await service.saveProfile({ name: 'Ada', description: '' })
      const file = new File([new Uint8Array(await createPng())], 'me.png', { type: 'image/png' })

      const saved = await service.uploadPhoto(file)

      expect(saved.hasPhoto).toBe(true)
    })

    it('Given text named as jpg, should reject with ValidationError', async () => {
      const file = new File([new Uint8Array(createTextAsJpg())], 'me.jpg', { type: 'image/jpeg' })

      await expect(service.uploadPhoto(file)).rejects.toBeInstanceOf(ValidationError)
    })
  })

  describe('finalize', () => {
    it('Given a valid owner, should complete, create one owner and revoke setup sessions', async () => {
      await service.saveProfile({ name: 'Ada', description: '' })
      const headers = await toCookieHeaders()

      const { authHeaders } = await service.finalize(OWNER)

      expect(authHeaders.getSetCookie().length).toBeGreaterThan(0)
      expect(await installationService.getStatus()).toBe('completed')
      expect(await countUsers()).toBe(1)
      expect((await service.getState(headers)).isUnlocked).toBe(false)
    })

    it('Given mismatching confirmation, should reject with ValidationError and create nothing', async () => {
      await service.saveProfile({ name: 'Ada', description: '' })

      await expect(
        service.finalize({ ...OWNER, passwordConfirmation: '::other-password::-1' }),
      ).rejects.toBeInstanceOf(ValidationError)
      expect(await countUsers()).toBe(0)
    })

    it('Given an invalid identifier, should reject with ValidationError', async () => {
      await service.saveProfile({ name: 'Ada', description: '' })

      await expect(service.finalize({ ...OWNER, identifier: 'a b' })).rejects.toBeInstanceOf(
        ValidationError,
      )
    })

    it('Given no saved profile, should reject with ValidationError', async () => {
      await expect(service.finalize(OWNER)).rejects.toBeInstanceOf(ValidationError)
    })

    it('Given a completed installation, should refuse with ForbiddenError', async () => {
      await service.saveProfile({ name: 'Ada', description: '' })
      await service.finalize(OWNER)

      await expect(service.finalize(OWNER)).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('Given two concurrent finalize calls, should create exactly one owner', async () => {
      await service.saveProfile({ name: 'Ada', description: '' })

      const results = await Promise.allSettled([service.finalize(OWNER), service.finalize(OWNER)])

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
      expect(await countUsers()).toBe(1)
    })
  })
})
