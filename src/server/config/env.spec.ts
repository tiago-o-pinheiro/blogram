import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv as parseDotenv } from 'node:util'

import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

describe('parseEnv', () => {
  it('Given the documented example environment, should accept local storage without S3 credentials', () => {
    const source = parseDotenv(
      readFileSync(resolve(import.meta.dirname, '../../../.env.example'), 'utf8'),
    )

    expect(parseEnv(source).STORAGE_DRIVER).toBe('local')
  })
  it('Given a production deployment with the development secret, should reject the configuration', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/BETTER_AUTH_SECRET/)
  })

  it('Given only one Google credential, should reject the incomplete configuration', () => {
    expect(() => parseEnv({ GOOGLE_CLIENT_ID: 'client-id' })).toThrow(/GOOGLE_CLIENT_SECRET/)
    expect(() => parseEnv({ GOOGLE_CLIENT_SECRET: 'client-secret' })).toThrow(/GOOGLE_CLIENT_ID/)
  })

  it('Given both Google credentials or blank optional credentials, should accept the configuration', () => {
    expect(
      parseEnv({ GOOGLE_CLIENT_ID: 'client-id', GOOGLE_CLIENT_SECRET: 'client-secret' })
        .GOOGLE_CLIENT_ID,
    ).toBe('client-id')
    expect(parseEnv({ GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' }).GOOGLE_CLIENT_ID).toBe('')
  })
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

  it('Given no setup or storage variables, should leave the setup password unset and use local storage', () => {
    const env = parseEnv({})

    expect(env.SETUP_PASSWORD).toBeUndefined()
    expect(env.STORAGE_DRIVER).toBe('local')
    expect(env.STORAGE_LOCAL_DIR).toBe('.data/uploads')
    expect(env.S3_REGION).toBe('auto')
    expect(env.S3_FORCE_PATH_STYLE).toBe(true)
    expect(env.UPLOAD_MAX_IMAGE_BYTES).toBe(10485760)
  })

  it('Given s3 variables as strings, should convert the flag and the upload limit', () => {
    const env = parseEnv({
      STORAGE_DRIVER: 's3',
      S3_FORCE_PATH_STYLE: 'false',
      UPLOAD_MAX_IMAGE_BYTES: '2048',
    })

    expect(env.STORAGE_DRIVER).toBe('s3')
    expect(env.S3_FORCE_PATH_STYLE).toBe(false)
    expect(env.UPLOAD_MAX_IMAGE_BYTES).toBe(2048)
  })

  it('Given an unknown storage driver, should throw naming STORAGE_DRIVER', () => {
    const parse = () => parseEnv({ STORAGE_DRIVER: '::driver::' })

    expect(parse).toThrow(/STORAGE_DRIVER/)
  })

  it('Given invalid variables, should name each of them in the error', () => {
    const parse = () => parseEnv({ PORT: '::port::', NODE_ENV: '::env::' })

    expect(parse).toThrow(/PORT/)
    expect(parse).toThrow(/NODE_ENV/)
  })
})
