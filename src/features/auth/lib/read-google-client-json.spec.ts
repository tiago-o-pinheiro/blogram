import { describe, expect, it } from 'vitest'

import { readGoogleClientJson } from './read-google-client-json'

describe('readGoogleClientJson', () => {
  it('Given a downloaded web client file, should read the client id, secret and redirects', () => {
    const text = JSON.stringify({
      web: {
        client_id: ' ::id::.apps.googleusercontent.com ',
        client_secret: '::secret::',
        redirect_uris: ['::redirect::'],
      },
    })

    expect(readGoogleClientJson(text)).toEqual({
      kind: 'web',
      clientId: '::id::.apps.googleusercontent.com',
      clientSecret: '::secret::',
      redirectUris: ['::redirect::'],
    })
  })

  it('Given a desktop client file, should flag the wrong client type', () => {
    expect(readGoogleClientJson('{"installed":{"client_id":"::id::"}}')).toEqual({ kind: 'other' })
  })

  it.each(['not json', '{}', '{"web":{"client_id":"::id::"}}'])(
    'Given unrelated text %s, should not read credentials',
    (text) => {
      expect(readGoogleClientJson(text)).toBeNull()
    },
  )
})
