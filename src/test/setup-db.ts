import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { afterAll, beforeEach, vi } from 'vitest'

const MIGRATIONS = join(import.meta.dirname, '..', '..', 'drizzle')

const pglite = await PGlite.create()
for (const name of readdirSync(MIGRATIONS)
  .filter((entry) => entry.endsWith('.sql'))
  .sort()) {
  await pglite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'))
}
const server = new PGLiteSocketServer({
  db: pglite,
  host: '127.0.0.1',
  port: 0,
  maxConnections: 10,
})
await server.start()
vi.stubEnv('DATABASE_URL', `postgresql://postgres:postgres@${server.getServerConn()}/postgres`)

beforeEach(async () => {
  const { rows } = await pglite.query<{ name: string }>(
    `SELECT quote_ident(tablename) AS name FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\\_%'`,
  )
  if (rows.length > 0) {
    await pglite.exec(`TRUNCATE ${rows.map((row) => row.name).join(', ')} CASCADE`)
  }
})

afterAll(async () => {
  const { db } = await import('@/server/lib/db')
  await db.$client.end()
  await server.stop()
  await pglite.close()
})
