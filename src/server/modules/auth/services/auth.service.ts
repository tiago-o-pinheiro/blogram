import { randomUUID } from 'node:crypto'

import { Models } from '@/models'

import { ConflictError, ValidationError } from '@/server/errors/http-errors'
import { auth } from '@/server/lib/auth'
import { type DbTransaction } from '@/server/lib/db'
import { account, user } from '@/server/modules/auth/schemas/auth.table'

const UNIQUE_VIOLATION_CODE = '23505'
const CREDENTIAL_PROVIDER_ID = 'credential'
const USERNAME_EMAIL_DOMAIN = 'owner.invalid'

const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  if ('code' in error && error.code === UNIQUE_VIOLATION_CODE) {
    return true
  }
  return 'cause' in error && isUniqueViolation(error.cause)
}

export class AuthService {
  handle = (request: Request): Promise<Response> => auth.handler(request)

  findUser = async (headers: Headers): Promise<Models.User | null> => {
    const session = await auth.api.getSession({ headers })
    if (!session) {
      return null
    }
    const { id, name, email } = session.user
    return { id, name, email }
  }

  createOwner = async (
    tx: DbTransaction,
    input: { identifier: string; password: string },
  ): Promise<{ id: string }> => {
    const identifier = Models.toOwnerIdentifier(input.identifier)
    if (!identifier) {
      throw new ValidationError('Invalid owner identifier')
    }
    const context = await auth.$context
    const passwordHash = await context.password.hash(input.password)
    const id = randomUUID()
    const isEmail = identifier.kind === 'email'
    const email = isEmail ? identifier.value : `${identifier.value}@${USERNAME_EMAIL_DOMAIN}`
    try {
      await tx.insert(user).values({
        id,
        name: identifier.value,
        email,
        emailVerified: isEmail,
        username: isEmail ? null : identifier.value,
        displayUsername: isEmail ? null : identifier.value,
      })
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: id,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: id,
        password: passwordHash,
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Owner already exists')
      }
      throw error
    }
    return { id }
  }

  signInOwner = async (identifier: string, password: string): Promise<Response> => {
    const parsed = Models.toOwnerIdentifier(identifier)
    if (!parsed) {
      throw new ValidationError('Invalid owner identifier')
    }
    if (parsed.kind === 'email') {
      return auth.api.signInEmail({
        body: { email: parsed.value, password },
        asResponse: true,
      })
    }
    return auth.api.signInUsername({
      body: { username: parsed.value, password },
      asResponse: true,
    })
  }
}

export const authService = new AuthService()
