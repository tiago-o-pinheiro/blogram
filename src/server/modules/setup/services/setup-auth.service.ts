import { createHash, timingSafeEqual } from 'node:crypto'

import { type Models } from '@/models'

import { env } from '@/server/config/env'
import {
  ForbiddenError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '@/server/errors/http-errors'
import { installationService } from '@/server/modules/installation/services/installation.service'

import { AttemptThrottleService, type ThrottlePolicy } from './attempt-throttle.service'
import { setupSessionService, type SetupSessionService } from './setup-session.service'

export const SETUP_THROTTLE = {
  clientMaxFailures: 5,
  globalMaxFailures: 30,
  windowSeconds: 15 * 60,
} as const

export const SETUP_PASSWORD_MIN = 12

const SETUP_POLICY: ThrottlePolicy = { scope: '', ...SETUP_THROTTLE }

type InstallationReader = { getStatus: () => Promise<Models.InstallationStatus> }

const digest = (value: string) => createHash('sha256').update(value).digest()

export class SetupAuthService {
  private readonly throttle: AttemptThrottleService

  constructor(
    private readonly getPassword: () => string | undefined,
    now: () => Date = () => new Date(),
    private readonly sessions: Pick<SetupSessionService, 'create'> = setupSessionService,
    private readonly installation: InstallationReader = installationService,
  ) {
    this.throttle = new AttemptThrottleService(now)
  }

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
    await this.throttle.consume(SETUP_POLICY, clientKey)
    if (!timingSafeEqual(digest(password), digest(expected))) {
      throw new UnauthorizedError('Invalid setup password')
    }
    await this.throttle.forgive(SETUP_POLICY, clientKey)
    return this.sessions.create()
  }
}

export const setupAuthService = new SetupAuthService(() => env.SETUP_PASSWORD)
