import { verifyPassword } from 'better-auth/crypto'
import pg from 'pg'
import { describe, expect, it } from 'vitest'

import { recoverOwner } from './recover-owner.mjs'
import { OWNER_PASSWORD_MAX } from '../src/models/owner-password.mjs'
import { db } from '../src/server/lib/db'
import { authService } from '../src/server/modules/auth/services/auth.service'
import { installation } from '../src/server/modules/installation/schemas/installation.table'

const OLD_PASSWORD = 'old-owner-password-12345'
const NEW_PASSWORD = 'new-owner-password-12345'

const connectedClient = async () => {
  const client = new pg.Client(db.$client.options)
  await client.connect()
  return client
}

const createCompletedOwner = async () => {
  const owner = await db.transaction((tx) =>
    authService.createOwner(tx, { identifier: 'owner@example.test', password: OLD_PASSWORD }),
  )
  await db
    .insert(installation)
    .values({ id: 'singleton', status: 'completed', ownerId: owner.id, completedAt: new Date() })
  return owner
}

describe('Owner recovery', () => {
  it('Given a completed installation, should replace the password, revoke sessions and keep setup locked', async () => {
    const owner = await createCompletedOwner()
    await authService.signInOwner('owner@example.test', OLD_PASSWORD)
    const client = await connectedClient()
    try {
      await recoverOwner(client, NEW_PASSWORD)

      const stored = await client.query(
        "SELECT password FROM account WHERE user_id = $1 AND provider_id = 'credential'",
        [owner.id],
      )
      expect(await verifyPassword({ hash: stored.rows[0].password, password: NEW_PASSWORD })).toBe(
        true,
      )
      expect(
        (await client.query('SELECT id FROM session WHERE user_id = $1', [owner.id])).rowCount,
      ).toBe(0)
      expect(
        (await client.query("SELECT status FROM installation WHERE id = 'singleton'")).rows[0]
          .status,
      ).toBe('completed')
      expect((await authService.signInOwner('owner@example.test', OLD_PASSWORD)).status).toBe(401)
      expect((await authService.signInOwner('owner@example.test', NEW_PASSWORD)).ok).toBe(true)
    } finally {
      await client.end()
    }
  })

  it('Given pending setup, should refuse recovery without creating an owner', async () => {
    const client = await connectedClient()
    try {
      await expect(recoverOwner(client, NEW_PASSWORD)).rejects.toThrow(/completed installation/)
      expect((await client.query('SELECT id FROM "user"')).rowCount).toBe(0)
    } finally {
      await client.end()
    }
  })

  it('Given a missing credential account, should restore password access for the same owner', async () => {
    const owner = await createCompletedOwner()
    const client = await connectedClient()
    try {
      await client.query("DELETE FROM account WHERE user_id = $1 AND provider_id = 'credential'", [
        owner.id,
      ])

      await recoverOwner(client, NEW_PASSWORD)

      expect((await authService.signInOwner('owner@example.test', NEW_PASSWORD)).ok).toBe(true)
      expect((await client.query('SELECT id FROM "user"')).rowCount).toBe(1)
    } finally {
      await client.end()
    }
  })

  it.each([
    ['an empty', ''],
    ['an overlong', 'x'.repeat(OWNER_PASSWORD_MAX + 1)],
  ])('Given %s password, should refuse it and keep the old credential', async (_name, password) => {
    await createCompletedOwner()
    const client = await connectedClient()
    try {
      await expect(recoverOwner(client, password)).rejects.toThrow(RangeError)
      expect((await authService.signInOwner('owner@example.test', OLD_PASSWORD)).ok).toBe(true)
    } finally {
      await client.end()
    }
  })

  it('Given a one-character password, should accept it and sign the owner in with it', async () => {
    await createCompletedOwner()
    const client = await connectedClient()
    try {
      await recoverOwner(client, 'x')

      expect((await authService.signInOwner('owner@example.test', 'x')).ok).toBe(true)
      expect((await authService.signInOwner('owner@example.test', OLD_PASSWORD)).status).toBe(401)
    } finally {
      await client.end()
    }
  })

  it('Given a password at the maximum length, should accept it and sign the owner in with it', async () => {
    await createCompletedOwner()
    const client = await connectedClient()
    const password = 'x'.repeat(OWNER_PASSWORD_MAX)
    try {
      await recoverOwner(client, password)

      expect((await authService.signInOwner('owner@example.test', password)).ok).toBe(true)
    } finally {
      await client.end()
    }
  })
})
