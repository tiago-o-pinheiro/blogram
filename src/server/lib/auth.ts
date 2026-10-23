import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api'
import { username } from 'better-auth/plugins'
import { and, eq } from 'drizzle-orm'

import { OWNER_PASSWORD_MAX, OWNER_PASSWORD_MIN } from '@/models/models'

import { env } from '@/server/config/env'
import { db } from '@/server/lib/db'
import * as schema from '@/server/modules/auth/schemas/auth.table'

const FRESH_SESSION_SECONDS = 300

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.CORS_ORIGIN],
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            disableSignUp: true,
            prompt: 'select_account',
          },
        }
      : {},
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      allowDifferentEmails: true,
      allowUnlinkingAll: false,
      updateUserInfoOnLink: false,
    },
  },
  session: { freshAge: FRESH_SESSION_SECONDS },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== '/link-social') {
        return
      }
      const session = await getSessionFromCtx(context)
      if (!session) {
        throw new APIError('UNAUTHORIZED', { message: 'Sign in before linking Google' })
      }
      if (Date.now() - session.session.createdAt.getTime() > FRESH_SESSION_SECONDS * 1000) {
        throw new APIError('FORBIDDEN', { message: 'Sign in again before linking Google' })
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          throw new APIError('FORBIDDEN', { message: 'Public sign-up is disabled' })
        },
      },
    },
    account: {
      delete: {
        before: async (linkedAccount) => {
          if (linkedAccount.providerId === 'credential') {
            throw new APIError('FORBIDDEN', { message: 'Password access must remain available' })
          }
          const [credential] = await db
            .select({ password: schema.account.password })
            .from(schema.account)
            .where(
              and(
                eq(schema.account.userId, linkedAccount.userId),
                eq(schema.account.providerId, 'credential'),
              ),
            )
            .limit(1)
          if (!credential?.password) {
            throw new APIError('FORBIDDEN', {
              message: 'Restore password access before unlinking Google',
            })
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: OWNER_PASSWORD_MIN,
    maxPasswordLength: OWNER_PASSWORD_MAX,
  },
  rateLimit: { enabled: env.NODE_ENV === 'production', storage: 'database' },
  advanced: { useSecureCookies: env.NODE_ENV === 'production' },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 32,
      usernameValidator: (value) => /^[a-z0-9_.-]+$/.test(value),
    }),
  ],
})
