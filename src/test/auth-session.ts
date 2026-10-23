import { POST } from '@/app/api/auth/[...all]/route'

export const CREDENTIALS = { email: 'member@example.test', password: '::password::-12345' }

const AUTH_URL = 'http://localhost:3000/api/auth'

const postAuth = (path: string, payload: unknown) =>
  POST(
    new Request(`${AUTH_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )

export const signUp = (credentials = CREDENTIALS) =>
  postAuth('/sign-up/email', { name: '::member::', ...credentials })

export const signIn = (credentials = CREDENTIALS) => postAuth('/sign-in/email', credentials)

export const toCookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

export const createSessionCookie = async () => toCookieHeader(await signUp())
