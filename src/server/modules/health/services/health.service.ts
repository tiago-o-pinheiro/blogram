import { type SQL, sql } from 'drizzle-orm'

import { type Models } from '@/models'

import { ServiceUnavailableError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'

const DATABASE_TIMEOUT_MS = 3000

export type HealthDatabase = { execute: (query: SQL) => PromiseLike<unknown> }

export class HealthService {
  constructor(
    private readonly database: HealthDatabase,
    private readonly timeoutMs: number = DATABASE_TIMEOUT_MS,
  ) {}

  getStatus = async (): Promise<Models.Health> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Database timeout')), this.timeoutMs)
    })
    try {
      await Promise.race([this.database.execute(sql`select 1`), timeout])
    } catch {
      throw new ServiceUnavailableError('Database unavailable')
    } finally {
      clearTimeout(timer)
    }
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }
  }
}

export const healthService = new HealthService(db)
