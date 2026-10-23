import { usernameClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

const customFetchImpl: typeof fetch = (input, init) => fetch(input, init)

export const authClient = createAuthClient({
  fetchOptions: { customFetchImpl },
  plugins: [usernameClient()],
})
