import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '@/server/config/env'

const DATABASE_POOL_MAX = 5

const pool = new Pool({ connectionString: env.DATABASE_URL, max: DATABASE_POOL_MAX })
attachDatabasePool(pool)

export const db = drizzle({ client: pool })

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
