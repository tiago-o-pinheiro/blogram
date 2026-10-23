import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { db } from '@/server/lib/db'
import { user } from '@/server/modules/auth/schemas/auth.table'

const listTables = async (): Promise<string[]> => {
  const result = await db.execute<{ table_name: string }>(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
  )
  return result.rows.map((row) => row.table_name)
}

const toUserRow = (id: string) => ({
  id,
  name: id,
  email: `${id}@example.com`,
})

describe('migrations', () => {
  it('Given the migrations are applied, should not have the notes table', async () => {
    expect(await listTables()).not.toContain('notes')
  })

  it('Given the migrations are applied, should have the installation tables', async () => {
    expect(await listTables()).toEqual(
      expect.arrayContaining([
        'installation',
        'profile',
        'setup_session',
        'setup_attempt',
        'rate_limit',
      ]),
    )
  })

  it('Given an existing user, should reject a second user row', async () => {
    await db.insert(user).values(toUserRow('first'))

    await expect(db.insert(user).values(toUserRow('second'))).rejects.toThrow()
  })
})
