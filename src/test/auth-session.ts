import { POST } from '@/app/api/auth/[...all]/route'
import { db } from '@/server/lib/db'
import { authService } from '@/server/modules/auth/services/auth.service'

export const CREDENTIALS = { email: 'owner@example.test', password: '::password::-12345' }

const AUTH_URL = 'http://localhost:3000/api/auth'

export const postAuth = (path: string, payload: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request(`${AUTH_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    }),
  )

export const signIn = (credentials = CREDENTIALS) => postAuth('/sign-in/email', credentials)

export const toCookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

export const createOwnerSession = async (credentials = CREDENTIALS) => {
  await db.transaction((tx) =>
    authService.createOwner(tx, {
      identifier: credentials.email,
      password: credentials.password,
    }),
  )
  return toCookieHeader(await authService.signInOwner(credentials.email, credentials.password))
}
