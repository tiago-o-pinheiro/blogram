import { vi } from 'vitest'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

const toUrl = (input: Parameters<typeof fetch>[0]): string =>
  input instanceof Request ? input.url : String(input)

export const stubGoogleTokenProbe = (error = 'invalid_grant') => {
  const realFetch = globalThis.fetch
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input, init) =>
      toUrl(input) === GOOGLE_TOKEN_URL
        ? Promise.resolve(
            Response.json({ error }, { status: error === 'invalid_client' ? 401 : 400 }),
          )
        : realFetch(input, init),
    )
}
