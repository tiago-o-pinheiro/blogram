import { describe, expect, it } from 'vitest'

import { db } from '@/server/lib/db'
import { setupAttempt } from '@/server/modules/setup/schemas/setup.table'

import { AttemptThrottleService } from './attempt-throttle.service'

describe('AttemptThrottleService claims', () => {
  it('BH-AUDIT-2: Given a claimed window, should preserve its start until expiry', async () => {
    const start = new Date('2026-11-02T12:00:00Z')
    let current = start
    const service = new AttemptThrottleService(() => current)
    const policy = { scope: 'like:post:Aaaaa11111', windowSeconds: 86400 }

    expect(await service.claim(policy, '192.0.2.1')).toBe(true)
    current = new Date(start.getTime() + 86399 * 1000)
    expect(await service.claim(policy, '192.0.2.1')).toBe(false)
    const rows = await db.select().from(setupAttempt)
    current = new Date(start.getTime() + 86400 * 1000)
    expect(await service.claim(policy, '192.0.2.1')).toBe(true)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.windowStartedAt).toEqual(start)
    expect(rows[0]?.key).toMatch(/^like:post:Aaaaa11111:client:[a-f0-9]{64}$/)
    expect(JSON.stringify(rows)).not.toContain('192.0.2.1')
  })

  it('BH-AUDIT-2: Given expired like rows, should prune only that scope', async () => {
    const current = new Date('2026-11-02T12:00:00Z')
    const service = new AttemptThrottleService(() => current)
    await db.insert(setupAttempt).values([
      { key: 'like:post:expired', windowStartedAt: new Date('2026-11-01T12:00:00Z') },
      { key: 'like:post:fresh', windowStartedAt: new Date('2026-11-02T11:00:00Z') },
      { key: 'auth:expired', windowStartedAt: new Date('2026-11-01T12:00:00Z') },
    ])

    await service.pruneExpired('like:post:', 86400)
    const rows = await db.select({ key: setupAttempt.key }).from(setupAttempt)

    expect(rows.map((row) => row.key).sort()).toEqual(['auth:expired', 'like:post:fresh'])
  })
})
