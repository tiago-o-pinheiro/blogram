import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'

import { assertStorageKey, type StorageDriver } from './driver'

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}
const FALLBACK_CONTENT_TYPE = 'application/octet-stream'

const isMissingFileError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

export const createLocalDriver = (directory: string): StorageDriver => {
  const root = resolve(directory)

  const toPath = (key: string): string => {
    assertStorageKey(key)
    const path = resolve(root, key)
    if (!path.startsWith(root + sep)) {
      throw new Error('Storage key escapes the storage directory')
    }
    return path
  }

  return {
    put: async (key, body) => {
      const path = toPath(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, body)
    },
    get: async (key) => {
      const path = toPath(key)
      try {
        const body = new Uint8Array(await readFile(path))
        return {
          body,
          contentType: CONTENT_TYPES[extname(path)] ?? FALLBACK_CONTENT_TYPE,
          size: body.byteLength,
        }
      } catch (error) {
        if (isMissingFileError(error)) {
          return null
        }
        throw error
      }
    },
    delete: async (key) => {
      await rm(toPath(key), { force: true })
    },
  }
}
