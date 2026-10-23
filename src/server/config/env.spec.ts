import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

describe('parseEnv', () => {
  it('Given no variables, should fall back to the defaults', () => {
    const env = parseEnv({})

    expect(env.NODE_ENV).toBe('development')
    expect(env.PORT).toBeGreaterThan(0)
  })

  it('Given a numeric string port, should convert it to a number', () => {
    const env = parseEnv({ PORT: '4010' })

    expect(env.PORT).toBe(4010)
  })

  it('Given a provided database url, should keep it', () => {
    const env = parseEnv({ DATABASE_URL: 'postgresql://::user:::pass@::host::/::db::' })

    expect(env.DATABASE_URL).toBe('postgresql://::user:::pass@::host::/::db::')
  })

  it('Given no auth variables, should fall back to the dev secret and url', () => {
    const env = parseEnv({})

    expect(env.BETTER_AUTH_SECRET.length).toBeGreaterThanOrEqual(32)
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3000')
  })

  it('Given a provided auth secret, should keep it', () => {
    const secret = '::secret::-0123456789abcdef0123456789'

    expect(parseEnv({ BETTER_AUTH_SECRET: secret }).BETTER_AUTH_SECRET).toBe(secret)
  })

  it('Given a short auth secret, should throw naming BETTER_AUTH_SECRET', () => {
    const parse = () => parseEnv({ BETTER_AUTH_SECRET: '::short::' })

    expect(parse).toThrow(/BETTER_AUTH_SECRET/)
  })

  it('Given invalid variables, should name each of them in the error', () => {
    const parse = () => parseEnv({ PORT: '::port::', NODE_ENV: '::env::' })

    expect(parse).toThrow(/PORT/)
    expect(parse).toThrow(/NODE_ENV/)
  })
})
