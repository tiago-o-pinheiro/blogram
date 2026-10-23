import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins'

import { OWNER_PASSWORD_MAX, OWNER_PASSWORD_MIN } from '@/models/models'

import { env } from '@/server/config/env'
import { db } from '@/server/lib/db'
import * as schema from '@/server/modules/auth/schemas/auth.table'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.CORS_ORIGIN],
  database: drizzleAdapter(db, { provider: 'pg', schema }),
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
