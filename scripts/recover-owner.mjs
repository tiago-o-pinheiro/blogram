import { randomUUID } from 'node:crypto'
import { createInterface, emitKeypressEvents } from 'node:readline'
import { pathToFileURL } from 'node:url'

import { hashPassword } from 'better-auth/crypto'
import pg from 'pg'

import { OWNER_PASSWORD_MAX, OWNER_PASSWORD_MIN } from '../src/models/owner-password.mjs'

export const recoverOwner = async (client, password) => {
  if (password.length < OWNER_PASSWORD_MIN || password.length > OWNER_PASSWORD_MAX) {
    throw new RangeError(
      `Password must be between ${OWNER_PASSWORD_MIN} and ${OWNER_PASSWORD_MAX} characters`,
    )
  }
  const passwordHash = await hashPassword(password)
  await client.query('BEGIN')
  try {
    const installation = await client.query(
      "SELECT owner_id FROM installation WHERE id = 'singleton' AND status = 'completed' FOR UPDATE",
    )
    const ownerId = installation.rows[0]?.owner_id
    if (typeof ownerId !== 'string') {
      throw new TypeError('Recovery requires a completed installation with an owner')
    }
    await client.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [ownerId])
    const credential = await client.query(
      "UPDATE account SET password = $1, updated_at = NOW() WHERE user_id = $2 AND provider_id = 'credential' RETURNING id",
      [passwordHash, ownerId],
    )
    if (credential.rowCount === 0) {
      await client.query(
        "INSERT INTO account (id, account_id, provider_id, user_id, password, updated_at) VALUES ($1, $2, 'credential', $2, $3, NOW())",
        [randomUUID(), ownerId, passwordHash],
      )
    }
    await client.query('DELETE FROM session WHERE user_id = $1', [ownerId])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

const readHidden = (prompt) =>
  new Promise((resolve, reject) => {
    let value = ''
    process.stdout.write(prompt)
    emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    const finish = () => {
      process.stdin.removeListener('keypress', handleKey)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdout.write('\n')
    }
    const handleKey = (text, key) => {
      if (key.ctrl && key.name === 'c') {
        finish()
        reject(new TypeError('Recovery cancelled'))
      } else if (key.name === 'return') {
        finish()
        resolve(value)
      } else if (key.name === 'backspace') {
        value = value.slice(0, -1)
      } else if (typeof text === 'string' && !key.ctrl && !key.meta) {
        value += text
      }
    }
    process.stdin.on('keypress', handleKey)
  })

const run = async () => {
  if (!process.stdin.isTTY) {
    throw new TypeError('Run recovery in an interactive terminal on your server')
  }
  const databaseUrl = await readHidden('Database connection URL (hidden): ')
  const password = await readHidden('New owner password (hidden): ')
  const confirmation = await readHidden('Confirm new password (hidden): ')
  if (password !== confirmation) {
    throw new TypeError('Passwords do not match')
  }
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  const confirmationAnswer = await new Promise((resolve) =>
    terminal.question('Reset owner password and revoke all sessions? Type RESET: ', resolve),
  )
  terminal.close()
  if (confirmationAnswer !== 'RESET') {
    throw new TypeError('Recovery cancelled')
  }
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await recoverOwner(client, password)
    process.stdout.write(
      'Owner password reset. All previous sessions were revoked. The installation wizard remains locked.\n',
    )
  } finally {
    await client.end()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run().catch(() => {
    process.stderr.write(
      'Recovery failed. Check your input and server database access. No credentials have been printed.\n',
    )
    process.exitCode = 1
  })
}
