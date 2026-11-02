import { Type } from 'typebox'
import { Value } from 'typebox/value'

export type GoogleClientJson =
  | { kind: 'web'; clientId: string; clientSecret: string; redirectUris: string[] }
  | { kind: 'other' }

const WebClientJson = Type.Object({
  web: Type.Object({
    client_id: Type.String({ minLength: 1 }),
    client_secret: Type.String({ minLength: 1 }),
    redirect_uris: Type.Optional(Type.Array(Type.String())),
  }),
})

const InstalledClientJson = Type.Object({ installed: Type.Object({}) })

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const readGoogleClientJson = (text: string): GoogleClientJson | null => {
  const parsed = parseJson(text.trim())
  if (Value.Check(WebClientJson, parsed)) {
    return {
      kind: 'web',
      clientId: parsed.web.client_id.trim(),
      clientSecret: parsed.web.client_secret.trim(),
      redirectUris: parsed.web.redirect_uris ?? [],
    }
  }
  return Value.Check(InstalledClientJson, parsed) ? { kind: 'other' } : null
}
