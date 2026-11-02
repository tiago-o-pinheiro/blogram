import { mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'

import { ValidationError } from '@/server/errors/http-errors'

import { assertStorageKey, type ByteRange, type StorageDriver } from './driver'

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}
const FALLBACK_CONTENT_TYPE = 'application/octet-stream'
const STREAM_CHUNK_BYTES = 256 * 1024

const isMissingFileError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

const toSlice = (total: number, range: ByteRange): { start: number; end: number } => {
  const end = Math.min(range.end ?? total - 1, total - 1)
  if (range.start < 0 || range.start > end) {
    throw new ValidationError('Invalid byte range')
  }
  return { start: range.start, end }
}

const toFileStream = (path: string, start: number, end: number): ReadableStream<Uint8Array> => {
  const cursor = { position: start }
  const opened = open(path, 'r')
  opened.catch(() => undefined)
  return new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      const handle = await opened
      const length = Math.min(STREAM_CHUNK_BYTES, end - cursor.position + 1)
      const chunk = new Uint8Array(Math.max(length, 0))
      const { bytesRead } =
        length > 0 ? await handle.read(chunk, 0, length, cursor.position) : { bytesRead: 0 }
      if (bytesRead === 0) {
        await handle.close()
        controller.close()
        return
      }
      cursor.position += bytesRead
      controller.enqueue(chunk.subarray(0, bytesRead))
    },
    cancel: async () => {
      await (await opened).close()
    },
  })
}

export const createLocalDriver = (directory: string): StorageDriver => {
  const root = resolve(directory)

  const toPath = (key: string): string => {
    assertStorageKey(key)
    const path = resolve(root, key)
    if (!path.startsWith(root + sep)) {
      throw new ValidationError('Storage key escapes the storage directory')
    }
    return path
  }

  return {
    put: async (key, body) => {
      const path = toPath(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, body)
    },
    get: async (key, options) => {
      const path = toPath(key)
      try {
        const contentType = CONTENT_TYPES[extname(path)] ?? FALLBACK_CONTENT_TYPE
        if (!options?.range) {
          const body = new Uint8Array(await readFile(path))
          return { body, contentType, size: body.byteLength }
        }
        const handle = await open(path, 'r')
        try {
          const { size } = await handle.stat()
          const range = toSlice(size, options.range)
          const body = new Uint8Array(range.end - range.start + 1)
          await handle.read(body, 0, body.byteLength, range.start)
          return { body, contentType, size, range }
        } finally {
          await handle.close()
        }
      } catch (error) {
        if (isMissingFileError(error)) {
          return null
        }
        throw error
      }
    },
    stream: async (key, options) => {
      const path = toPath(key)
      try {
        const { size } = await stat(path)
        const contentType = CONTENT_TYPES[extname(path)] ?? FALLBACK_CONTENT_TYPE
        const range = options?.range ? toSlice(size, options.range) : undefined
        const body = toFileStream(path, range?.start ?? 0, range?.end ?? size - 1)
        return range ? { body, contentType, size, range } : { body, contentType, size }
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
