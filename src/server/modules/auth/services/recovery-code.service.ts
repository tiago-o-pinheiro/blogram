import { createHash, randomInt, randomUUID } from 'node:crypto'

import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { and, count, desc, eq, isNull, like } from 'drizzle-orm'

import { Models } from '@/models'

import { ForbiddenError, UnauthorizedError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { account, session, user, verification } from '@/server/modules/auth/schemas/auth.table'
import { recoveryCode } from '@/server/modules/auth/schemas/recovery-code.table'
import { installation } from '@/server/modules/installation/schemas/installation.table'
import {
  AttemptThrottleService,
  type ThrottlePolicy,
} from '@/server/modules/setup/services/attempt-throttle.service'

export const RECOVERY_THROTTLE: ThrottlePolicy = {
  scope: 'recovery',
  clientMaxFailures: 5,
  globalMaxFailures: 50,
  windowSeconds: 15 * 60,
}

const CREDENTIAL_PROVIDER_ID = 'credential'
const RESET_PASSWORD_PREFIX = 'reset-password:%'

const toCodeHash = (code: string): string => createHash('sha256').update(code).digest('hex')

const createCode = (): string =>
  Array.from({ length: Models.RECOVERY_CODE_GROUPS }, () =>
    Array.from({ length: Models.RECOVERY_CODE_GROUP_LENGTH }, () =>
      Models.RECOVERY_CODE_ALPHABET.charAt(randomInt(Models.RECOVERY_CODE_ALPHABET.length)),
    ).join(''),
  ).join('-')

const toIdentifier = (owner: { username: string | null; email: string }): string =>
  owner.username ?? owner.email

export class RecoveryCodeService {
  constructor(private readonly throttle: AttemptThrottleService = new AttemptThrottleService()) {}

  getStatus = async (userId: string): Promise<Models.RecoveryCodeStatus> => {
    const [unused] = await db
      .select({ remaining: count() })
      .from(recoveryCode)
      .where(and(eq(recoveryCode.userId, userId), isNull(recoveryCode.usedAt)))
    const [latest] = await db
      .select({ createdAt: recoveryCode.createdAt })
      .from(recoveryCode)
      .where(eq(recoveryCode.userId, userId))
      .orderBy(desc(recoveryCode.createdAt))
      .limit(1)
    return {
      remaining: unused?.remaining ?? 0,
      generatedAt: latest ? latest.createdAt.toISOString() : null,
    }
  }

  generate = async (userId: string, password: string): Promise<Models.RecoveryCodeList> => {
    const [credential] = await db
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)))
      .limit(1)
    const isValid = credential?.password
      ? await verifyPassword({ hash: credential.password, password })
      : false
    if (!isValid) {
      throw new ForbiddenError('Current password is wrong', { reason: 'invalid-password' })
    }
    const codes = Array.from({ length: Models.RECOVERY_CODE_COUNT }, createCode)
    await db.transaction(async (tx) => {
      await tx.delete(recoveryCode).where(eq(recoveryCode.userId, userId))
      await tx
        .insert(recoveryCode)
        .values(codes.map((code) => ({ userId, codeHash: toCodeHash(code) })))
    })
    return { codes }
  }

  redeem = async (
    input: Models.RecoveryCodeRedeem,
    clientKey: string,
  ): Promise<Models.RecoveryCodeRedeemed> => {
    await this.throttle.consume(RECOVERY_THROTTLE, clientKey)
    const code = Models.toRecoveryCode(input.code)
    if (!code || !(await this.isUnused(code))) {
      throw new UnauthorizedError('Invalid recovery code')
    }
    const passwordHash = await hashPassword(input.newPassword)
    const owner = await db.transaction(async (tx) => {
      const [installed] = await tx
        .select({ ownerId: installation.ownerId })
        .from(installation)
        .where(eq(installation.status, 'completed'))
        .limit(1)
      const ownerId = installed?.ownerId
      if (!ownerId) {
        return null
      }
      const [used] = await tx
        .update(recoveryCode)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(recoveryCode.codeHash, toCodeHash(code)),
            eq(recoveryCode.userId, ownerId),
            isNull(recoveryCode.usedAt),
          ),
        )
        .returning({ id: recoveryCode.id })
      if (!used) {
        return null
      }
      const updated = await tx
        .update(account)
        .set({ password: passwordHash })
        .where(and(eq(account.userId, ownerId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)))
        .returning({ id: account.id })
      if (updated.length === 0) {
        await tx.insert(account).values({
          id: randomUUID(),
          accountId: ownerId,
          providerId: CREDENTIAL_PROVIDER_ID,
          userId: ownerId,
          password: passwordHash,
        })
      }
      await tx.delete(session).where(eq(session.userId, ownerId))
      await tx
        .delete(verification)
        .where(
          and(
            eq(verification.value, ownerId),
            like(verification.identifier, RESET_PASSWORD_PREFIX),
          ),
        )
      const [found] = await tx
        .select({ username: user.username, email: user.email })
        .from(user)
        .where(eq(user.id, ownerId))
      return found ?? null
    })
    if (!owner) {
      throw new UnauthorizedError('Invalid recovery code')
    }
    await this.throttle.forgive(RECOVERY_THROTTLE, clientKey)
    return { identifier: toIdentifier(owner) }
  }

  private isUnused = async (code: string): Promise<boolean> => {
    const [found] = await db
      .select({ id: recoveryCode.id })
      .from(recoveryCode)
      .where(and(eq(recoveryCode.codeHash, toCodeHash(code)), isNull(recoveryCode.usedAt)))
      .limit(1)
    return found !== undefined
  }
}

export const recoveryCodeService = new RecoveryCodeService()
