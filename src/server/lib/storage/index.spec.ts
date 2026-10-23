import { describe, expect, it } from 'vitest'

import { parseEnv } from '@/server/config/env'

import { createStorage } from './index'

describe('createStorage', () => {
  it('Given the s3 driver without its variables, should fail with a clear error', () => {
    const config = parseEnv({ STORAGE_DRIVER: 's3' })

    expect(() => createStorage(config)).toThrow(/S3_ENDPOINT, S3_BUCKET/)
  })

  it('Given the local driver, should create a driver without extra variables', () => {
    const config = parseEnv({ STORAGE_DRIVER: 'local' })

    expect(createStorage(config)).toEqual(
      expect.objectContaining({ put: expect.any(Function), get: expect.any(Function) }),
    )
  })
})
