import { drizzle } from 'drizzle-orm/node-postgres'

import { env } from '@/server/config/env'

export const db = drizzle(env.DATABASE_URL)

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
