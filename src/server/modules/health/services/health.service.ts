import { type SQL, sql } from 'drizzle-orm'

import { type Models } from '@/models'

import { ServiceUnavailableError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'

export type HealthDatabase = { execute: (query: SQL) => PromiseLike<unknown> }

export class HealthService {
  constructor(private readonly database: HealthDatabase) {}

  getStatus = async (): Promise<Models.Health> => {
    try {
      await this.database.execute(sql`select 1`)
    } catch {
      throw new ServiceUnavailableError('Database unavailable')
    }
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }
  }
}

export const healthService = new HealthService(db)
