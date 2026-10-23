import { createHash, timingSafeEqual } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import { type Models } from '@/models'

import { env } from '@/server/config/env'
import {
  ForbiddenError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
} from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { setupAttempt } from '@/server/modules/setup/schemas/setup.table'

import { setupSessionService, type SetupSessionService } from './setup-session.service'

export const SETUP_THROTTLE = {
  clientMaxFailures: 5,
  globalMaxFailures: 30,
  windowSeconds: 15 * 60,
} as const

export const SETUP_PASSWORD_MIN = 12

const GLOBAL_KEY = 'global'

type InstallationReader = { getStatus: () => Promise<Models.InstallationStatus> }

type AttemptCount = { failures: number; windowStartedAt: Date }

const digest = (value: string) => createHash('sha256').update(value).digest()

export class SetupAuthService {
  constructor(
    private readonly getPassword: () => string | undefined,
    private readonly now: () => Date = () => new Date(),
    private readonly sessions: Pick<SetupSessionService, 'create'> = setupSessionService,
    private readonly installation: InstallationReader = installationService,
  ) {}

  isConfigured = (): boolean => {
    const password = this.getPassword()
    return password !== undefined && password.length >= SETUP_PASSWORD_MIN
  }

  unlock = async (
    password: string,
    clientKey: string,
  ): Promise<{ token: string; expiresAt: Date }> => {
    if ((await this.installation.getStatus()) === 'completed') {
      throw new ForbiddenError('Setup is already complete')
    }
    const expected = this.getPassword()
    if (expected === undefined || expected.length < SETUP_PASSWORD_MIN) {
      throw new ServiceUnavailableError('Setup password is not configured')
    }
    const clientRowKey = `client:${digest(clientKey).toString('hex')}`
    const clientAttempt = await this.recordAttempt(clientRowKey)
    const clientLockedUntil = this.getLockedUntil(clientAttempt, SETUP_THROTTLE.clientMaxFailures)
    if (clientLockedUntil > 0) {
      throw this.toTooManyRequests(clientLockedUntil)
    }
    const globalAttempt = await this.recordAttempt(GLOBAL_KEY)
    const globalLockedUntil = this.getLockedUntil(globalAttempt, SETUP_THROTTLE.globalMaxFailures)
    if (globalLockedUntil > 0) {
      throw this.toTooManyRequests(globalLockedUntil)
    }
    if (!timingSafeEqual(digest(password), digest(expected))) {
      throw new UnauthorizedError('Invalid setup password')
    }
    await db.delete(setupAttempt).where(eq(setupAttempt.key, clientRowKey))
    await db
      .update(setupAttempt)
      .set({ failures: sql`greatest(${setupAttempt.failures} - 1, 0)` })
      .where(eq(setupAttempt.key, GLOBAL_KEY))
    return this.sessions.create()
  }

  private toTooManyRequests = (lockedUntil: number): TooManyRequestsError =>
    new TooManyRequestsError('Too many attempts', {
      retryAfterSeconds: Math.ceil((lockedUntil - this.now().getTime()) / 1000),
    })

  private getLockedUntil = (attempt: AttemptCount, maxFailures: number): number =>
    attempt.failures > maxFailures
      ? attempt.windowStartedAt.getTime() + SETUP_THROTTLE.windowSeconds * 1000
      : 0

  private recordAttempt = async (key: string): Promise<AttemptCount> => {
    const current = this.now()
    const windowSeconds = SETUP_THROTTLE.windowSeconds
    const expiredBefore = new Date(current.getTime() - windowSeconds * 1000)
    const isExpired = sql`${setupAttempt.windowStartedAt} <= ${expiredBefore.toISOString()}::timestamptz`
    const [row] = await db
      .insert(setupAttempt)
      .values({ key, failures: 1, windowStartedAt: current })
      .onConflictDoUpdate({
        target: setupAttempt.key,
        set: {
          failures: sql`(case when ${isExpired} then 1 else ${setupAttempt.failures} + 1 end)`,
          windowStartedAt: sql`(case when ${isExpired} then ${current.toISOString()}::timestamptz else ${setupAttempt.windowStartedAt} end)`,
        },
      })
      .returning({
        failures: setupAttempt.failures,
        windowStartedAt: setupAttempt.windowStartedAt,
      })
    if (!row) {
      throw new ServiceUnavailableError('Could not record setup attempt')
    }
    return row
  }
}

export const setupAuthService = new SetupAuthService(() => env.SETUP_PASSWORD)
