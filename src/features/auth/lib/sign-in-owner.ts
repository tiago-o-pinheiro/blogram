import { toOwnerIdentifier } from '@/models/models'

import { authClient } from '@/lib/auth-client'

type SignInResult = { status: number | null }

const OFFLINE_RESULT = { error: { status: 0 } }

export const signInOwner = async (
  rawIdentifier: string,
  password: string,
): Promise<SignInResult> => {
  const identifier = toOwnerIdentifier(rawIdentifier)
  if (!identifier) {
    return { status: 401 }
  }
  const result = await (
    identifier.kind === 'email'
      ? authClient.signIn.email({ email: identifier.value, password })
      : authClient.signIn.username({ username: identifier.value, password })
  ).catch(() => OFFLINE_RESULT)
  return { status: result.error ? result.error.status : null }
}
