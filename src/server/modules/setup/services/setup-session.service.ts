import { createHash, randomBytes } from 'node:crypto'

import { and, eq, gt, lte } from 'drizzle-orm'

import { env } from '@/server/config/env'
import { readCookie, serializeClearedCookie, serializeCookie } from '@/server/lib/cookies'
import { db, type DbTransaction } from '@/server/lib/db'
import { setupSession } from '@/server/modules/setup/schemas/setup.table'

export const SETUP_COOKIE_NAME = 'blogram_setup'
export const SETUP_SESSION_TTL_SECONDS = 24 * 60 * 60

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export class SetupSessionService {
  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly isSecure: boolean = env.NODE_ENV === 'production',
  ) {}

  create = async (): Promise<{ token: string; expiresAt: Date }> => {
    const token = randomBytes(32).toString('base64url')
    const issuedAt = this.now()
    const expiresAt = new Date(issuedAt.getTime() + SETUP_SESSION_TTL_SECONDS * 1000)
    await db.delete(setupSession).where(lte(setupSession.expiresAt, issuedAt))
    await db.insert(setupSession).values({ tokenHash: hashToken(token), expiresAt })
    return { token, expiresAt }
  }

  isValid = async (token: string | null): Promise<boolean> => {
    if (!token) {
      return false
    }
    const rows = await db
      .select({ id: setupSession.id })
      .from(setupSession)
      .where(
        and(eq(setupSession.tokenHash, hashToken(token)), gt(setupSession.expiresAt, this.now())),
      )
      .limit(1)
    return rows.length > 0
  }

  revokeAll = async (tx?: DbTransaction): Promise<void> => {
    await (tx ?? db).delete(setupSession)
  }

  readToken = (headers: Headers): string | null => readCookie(headers, SETUP_COOKIE_NAME)

  toSetCookie = (token: string, expiresAt: Date): string =>
    serializeCookie(SETUP_COOKIE_NAME, token, {
      maxAgeSeconds: Math.max(0, Math.floor((expiresAt.getTime() - this.now().getTime()) / 1000)),
      isSecure: this.isSecure,
    })

  toClearCookie = (): string => serializeClearedCookie(SETUP_COOKIE_NAME, this.isSecure)
}

export const setupSessionService = new SetupSessionService()
