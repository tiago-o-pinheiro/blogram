import { createHash } from 'node:crypto'

import { and, eq, lte, sql } from 'drizzle-orm'

import { ServiceUnavailableError, TooManyRequestsError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { setupAttempt } from '@/server/modules/setup/schemas/setup.table'

export type ThrottlePolicy = {
  scope: string
  clientMaxFailures: number
  globalMaxFailures: number
  windowSeconds: number
}

type AttemptCount = { failures: number; windowStartedAt: Date }

const toClientRowKey = (scope: string, clientKey: string): string => {
  const hash = createHash('sha256').update(clientKey).digest('hex')
  return scope === '' ? `client:${hash}` : `${scope}:client:${hash}`
}

const toGlobalRowKey = (scope: string): string => (scope === '' ? 'global' : `${scope}:global`)

export class AttemptThrottleService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  consume = async (
    policy: ThrottlePolicy,
    clientKey: string,
    executor: Pick<typeof db, 'insert'> = db,
  ): Promise<void> => {
    const clientAttempt = await this.record(
      policy,
      toClientRowKey(policy.scope, clientKey),
      executor,
    )
    this.assertOpen(policy, clientAttempt, policy.clientMaxFailures)
    const globalAttempt = await this.record(policy, toGlobalRowKey(policy.scope), executor)
    this.assertOpen(policy, globalAttempt, policy.globalMaxFailures)
  }

  claim = async (
    policy: Pick<ThrottlePolicy, 'scope' | 'windowSeconds'>,
    clientKey: string,
    executor: Pick<typeof db, 'insert'> = db,
  ): Promise<boolean> => {
    const current = this.now()
    const expiredBefore = new Date(current.getTime() - policy.windowSeconds * 1000)
    const rows = await executor
      .insert(setupAttempt)
      .values({
        key: toClientRowKey(policy.scope, clientKey),
        failures: 1,
        windowStartedAt: current,
      })
      .onConflictDoUpdate({
        target: setupAttempt.key,
        set: { failures: 1, windowStartedAt: current },
        setWhere: lte(setupAttempt.windowStartedAt, expiredBefore),
      })
      .returning({ key: setupAttempt.key })
    return rows.length > 0
  }

  pruneExpired = async (scopePrefix: string, windowSeconds: number): Promise<void> => {
    const expiredBefore = new Date(this.now().getTime() - windowSeconds * 1000)
    await db
      .delete(setupAttempt)
      .where(
        and(
          sql`${setupAttempt.key} like ${`${scopePrefix}%`}`,
          lte(setupAttempt.windowStartedAt, expiredBefore),
        ),
      )
  }

  forgive = async (policy: ThrottlePolicy, clientKey: string): Promise<void> => {
    await db
      .delete(setupAttempt)
      .where(eq(setupAttempt.key, toClientRowKey(policy.scope, clientKey)))
    await db
      .update(setupAttempt)
      .set({ failures: sql`greatest(${setupAttempt.failures} - 1, 0)` })
      .where(eq(setupAttempt.key, toGlobalRowKey(policy.scope)))
  }

  private assertOpen = (policy: ThrottlePolicy, attempt: AttemptCount, maxFailures: number) => {
    if (attempt.failures <= maxFailures) {
      return
    }
    const lockedUntil = attempt.windowStartedAt.getTime() + policy.windowSeconds * 1000
    throw new TooManyRequestsError('Too many attempts', {
      retryAfterSeconds: Math.ceil((lockedUntil - this.now().getTime()) / 1000),
    })
  }

  private record = async (
    policy: ThrottlePolicy,
    key: string,
    executor: Pick<typeof db, 'insert'>,
  ): Promise<AttemptCount> => {
    const current = this.now()
    const expiredBefore = new Date(current.getTime() - policy.windowSeconds * 1000)
    const isExpired = sql`${setupAttempt.windowStartedAt} <= ${expiredBefore.toISOString()}::timestamptz`
    const [row] = await executor
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
      throw new ServiceUnavailableError('Could not record the attempt')
    }
    return row
  }
}
