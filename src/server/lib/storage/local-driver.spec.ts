import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ValidationError } from '@/server/errors/http-errors'

import { createStorageKey } from './driver'
import { type StorageDriver } from './driver'
import { createLocalDriver } from './local-driver'

describe('createLocalDriver', () => {
  let directory: string
  let driver: StorageDriver

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'blogram-local-driver-'))
    driver = createLocalDriver(directory)
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('Given a stored object, should get the same bytes with the extension content type', async () => {
    const key = createStorageKey('profile', 'webp')
    await driver.put(key, new Uint8Array([1, 2, 3]), 'image/webp')

    const object = await driver.get(key)

    expect(object).toEqual({ body: new Uint8Array([1, 2, 3]), contentType: 'image/webp', size: 3 })
  })

  it('Given a byte range, should return only that slice with the total size', async () => {
    const key = createStorageKey('profile', 'webp')
    await driver.put(key, new Uint8Array([10, 11, 12, 13, 14]), 'image/webp')

    const object = await driver.get(key, { range: { start: 1, end: 3 } })

    expect(object).toEqual({
      body: new Uint8Array([11, 12, 13]),
      contentType: 'image/webp',
      size: 5,
      range: { start: 1, end: 3 },
    })
  })

  it('Given an open-ended or oversized range, should clamp to the last byte', async () => {
    const key = createStorageKey('profile', 'webp')
    await driver.put(key, new Uint8Array([10, 11, 12]), 'image/webp')

    expect((await driver.get(key, { range: { start: 1 } }))?.body).toEqual(new Uint8Array([11, 12]))
    expect((await driver.get(key, { range: { start: 2, end: 99 } }))?.range).toEqual({
      start: 2,
      end: 2,
    })
  })

  it('Given a range starting past the end, should throw a ValidationError', async () => {
    const key = createStorageKey('profile', 'webp')
    await driver.put(key, new Uint8Array([1]), 'image/webp')

    await expect(driver.get(key, { range: { start: 5 } })).rejects.toBeInstanceOf(ValidationError)
  })

  it('Given a key that escapes the directory, should throw a ValidationError', async () => {
    await expect(driver.get('../secret.webp')).rejects.toBeInstanceOf(ValidationError)
  })

  it('Given an unknown key, should get null', async () => {
    expect(await driver.get(createStorageKey('profile', 'webp'))).toBeNull()
  })

  it('Given a stored object, should delete it and tolerate deleting twice', async () => {
    const key = createStorageKey('profile', 'png')
    await driver.put(key, new Uint8Array([9]), 'image/png')

    await driver.delete(key)
    await driver.delete(key)

    expect(await driver.get(key)).toBeNull()
  })

  it.each(['../secret.webp', 'profile/../../secret.webp', '/etc/passwd', 'profile/name.webp', ''])(
    'Given the key %j that is not server-shaped, should reject it',
    async (key) => {
      await expect(driver.put(key, new Uint8Array([1]), 'image/webp')).rejects.toThrow()
      await expect(driver.get(key)).rejects.toThrow()
      await expect(driver.delete(key)).rejects.toThrow()
    },
  )
})
