// @vitest-environment node
import { count } from 'drizzle-orm'
import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { ConflictError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { user } from '@/server/modules/auth/schemas/auth.table'
import { AuthService } from '@/server/modules/auth/services/auth.service'

const PASSWORD = '::owner-password::-12345'
const service = new AuthService()

const createOwner = (identifier: string, password = PASSWORD) =>
  db.transaction((tx) => service.createOwner(tx, { identifier, password }))

const countUsers = async () => {
  const [row] = await db.select({ total: count() }).from(user)
  return row?.total
}

describe('AuthService', () => {
  it('Given an email owner, should sign in by email with a session cookie', async () => {
    await createOwner('Owner@Example.test')

    const response = await service.signInOwner('owner@example.test', PASSWORD)

    expect(response.status).toBe(StatusCodes.OK)
    expect(response.headers.getSetCookie().length).toBeGreaterThan(0)
  })

  it('Given a username owner, should sign in by username', async () => {
    await createOwner('the.owner')

    const response = await service.signInOwner('the.owner', PASSWORD)

    expect(response.status).toBe(StatusCodes.OK)
  })

  it('Given a wrong password, should answer 401', async () => {
    await createOwner('the.owner')

    const response = await service.signInOwner('the.owner', '::wrong-password::-1')

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given a session cookie, should find the owner user', async () => {
    const { id } = await createOwner('owner@example.test')
    const response = await service.signInOwner('owner@example.test', PASSWORD)
    const cookie = response.headers
      .getSetCookie()
      .map((entry) => entry.split(';')[0])
      .join('; ')

    const found = await service.findUser(new Headers({ cookie }))

    expect(found?.id).toBe(id)
  })

  it('Given no cookie, should find no user', async () => {
    expect(await service.findUser(new Headers())).toBeNull()
  })

  it('Given a second owner, should throw ConflictError and keep one user', async () => {
    await createOwner('first@example.test')

    await expect(createOwner('second@example.test')).rejects.toBeInstanceOf(ConflictError)
    expect(await countUsers()).toBe(1)
  })

  it('Given an invalid identifier, should throw ValidationError', async () => {
    await expect(createOwner('no')).rejects.toBeInstanceOf(ValidationError)
    await expect(service.signInOwner('no', PASSWORD)).rejects.toBeInstanceOf(ValidationError)
  })
})
