import { randomUUID } from 'node:crypto'

import { ValidationError } from '@/server/errors/http-errors'

export type ByteRange = { start: number; end?: number }

export type StorageReadOptions = { range?: ByteRange }

export type StorageObject = {
  body: Uint8Array
  contentType: string
  size: number
  range?: { start: number; end: number }
}

export type StorageDriver = {
  put: (key: string, body: Uint8Array, contentType: string) => Promise<void>
  get: (key: string, options?: StorageReadOptions) => Promise<StorageObject | null>
  delete: (key: string) => Promise<void>
}

const STORAGE_KEY_PATTERN =
  /^[a-z0-9-]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/
const STORAGE_PREFIX_PATTERN = /^[a-z0-9-]+$/
const STORAGE_EXTENSION_PATTERN = /^[a-z0-9]{2,5}$/

export const assertStorageKey = (key: string): void => {
  if (!STORAGE_KEY_PATTERN.test(key)) {
    throw new ValidationError('Invalid storage key')
  }
}

export const createStorageKey = (prefix: string, extension: string): string => {
  if (!STORAGE_PREFIX_PATTERN.test(prefix) || !STORAGE_EXTENSION_PATTERN.test(extension)) {
    throw new ValidationError('Invalid storage key parts')
  }
  return `${prefix}/${randomUUID()}.${extension}`
}
