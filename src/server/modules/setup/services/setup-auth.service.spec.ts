// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { type Models } from '@/models'

import {
  ForbiddenError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
} from '@/server/errors/http-errors'

import { SETUP_THROTTLE, SetupAuthService } from './setup-auth.service'
import { SetupSessionService } from './setup-session.service'

const PASSWORD = '::correct-password::'
const START = new Date('2026-01-01T00:00:00.000Z')

const createService = (
  options: { password?: string; status?: Models.InstallationStatus; clock?: { now: Date } } = {},
) => {
  const clock = options.clock ?? { now: START }
  const sessions = new SetupSessionService(() => clock.now, false)
  const service = new SetupAuthService(
    () => ('password' in options ? options.password : PASSWORD),
    () => clock.now,
    sessions,
    { getStatus: () => Promise.resolve(options.status ?? 'pending') },
  )
  return { service, sessions, clock }
}

const failTimes = async (service: SetupAuthService, clientKey: string, times: number) => {
  for (let attempt = 0; attempt < times; attempt += 1) {
    await expect(service.unlock('::wrong::', clientKey)).rejects.toBeInstanceOf(UnauthorizedError)
  }
}

describe('SetupAuthService', () => {
  it('Given the correct password, should create a session that validates', async () => {
    const { service, sessions } = createService()

    const { token } = await service.unlock(PASSWORD, '::client::')

    expect(await sessions.isValid(token)).toBe(true)
  })

  it('Given a wrong password, should throw Unauthorized without echoing it', async () => {
    const { service } = createService()

    const error = await service.unlock('::wrong-secret::', '::client::').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(UnauthorizedError)
    expect(error).toMatchObject({ message: expect.not.stringContaining('::wrong-secret::') })
  })

  it.each([undefined, 'too-short'])(
    'Given the configured password is %s, should throw ServiceUnavailable',
    async (password) => {
      const { service } = createService({ password })

      expect(service.isConfigured()).toBe(false)
      await expect(service.unlock('anything', '::client::')).rejects.toBeInstanceOf(
        ServiceUnavailableError,
      )
    },
  )

  it('Given a long enough password, should report configured', () => {
    expect(createService().service.isConfigured()).toBe(true)
  })

  it('Given a completed installation, should refuse even the correct password', async () => {
    const { service } = createService({ status: 'completed' })

    await expect(service.unlock(PASSWORD, '::client::')).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('Given 5 wrong attempts from one client, should throttle the correct password with Retry-After', async () => {
    const { service, clock } = createService()
    await failTimes(service, '::client::', SETUP_THROTTLE.clientMaxFailures)
    clock.now = new Date(START.getTime() + 60 * 1000)

    const error = await service.unlock(PASSWORD, '::client::').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(TooManyRequestsError)
    expect(error).toMatchObject({
      details: { retryAfterSeconds: SETUP_THROTTLE.windowSeconds - 60 },
    })
  })

  it('Given a throttled client, should still allow another client', async () => {
    const { service } = createService()
    await failTimes(service, '::client::', SETUP_THROTTLE.clientMaxFailures)

    const { token } = await service.unlock(PASSWORD, '::other-client::')

    expect(token).not.toBe('')
  })

  it('Given the window has ended, should accept the correct password again', async () => {
    const { service, clock } = createService()
    await failTimes(service, '::client::', SETUP_THROTTLE.clientMaxFailures)
    clock.now = new Date(START.getTime() + SETUP_THROTTLE.windowSeconds * 1000)

    const { token } = await service.unlock(PASSWORD, '::client::')

    expect(token).not.toBe('')
  })

  it('Given a success, should reset the client failure counter', async () => {
    const { service } = createService()
    await failTimes(service, '::client::', SETUP_THROTTLE.clientMaxFailures - 1)
    await service.unlock(PASSWORD, '::client::')

    await failTimes(service, '::client::', SETUP_THROTTLE.clientMaxFailures - 1)

    await expect(service.unlock(PASSWORD, '::client::')).resolves.toBeDefined()
  })

  it('Given 30 failures across clients, should throttle every client globally', async () => {
    const { service } = createService()
    for (let client = 0; client < SETUP_THROTTLE.globalMaxFailures; client += 1) {
      await failTimes(service, `::client-${client}::`, 1)
    }

    await expect(service.unlock(PASSWORD, '::fresh-client::')).rejects.toBeInstanceOf(
      TooManyRequestsError,
    )
  })

  it('Given the service is re-created, should keep the throttle from the database', async () => {
    const first = createService()
    await failTimes(first.service, '::client::', SETUP_THROTTLE.clientMaxFailures)

    await expect(createService().service.unlock(PASSWORD, '::client::')).rejects.toBeInstanceOf(
      TooManyRequestsError,
    )
  })

  it('Given the service is re-created after an interruption, should unlock again with the correct password', async () => {
    const first = createService()
    const earlier = await first.service.unlock(PASSWORD, '::client::')

    const restarted = createService({ clock: first.clock })
    const again = await restarted.service.unlock(PASSWORD, '::client::')

    expect(await restarted.sessions.isValid(again.token)).toBe(true)
    expect(await restarted.sessions.isValid(earlier.token)).toBe(true)
  })
})
