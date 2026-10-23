import { AwsClient } from 'aws4fetch'
import { StatusCodes } from 'http-status-codes'

import { GlobalError } from '@/server/errors/global-error'

import { assertStorageKey, type StorageDriver } from './driver'

export type S3Config = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

type FetchLike = (request: Request) => Promise<Response>

const FALLBACK_CONTENT_TYPE = 'application/octet-stream'

const CONTENT_RANGE_PATTERN = /^bytes (\d+)-(\d+)\/(\d+)$/

const parseContentRange = (
  header: string | null,
): { start: number; end: number; total: number } | null => {
  const match = header ? CONTENT_RANGE_PATTERN.exec(header) : null
  if (!match) {
    return null
  }
  return { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) }
}

export const createS3Driver = (
  config: S3Config,
  sendRequest: FetchLike = (request) => fetch(request),
): StorageDriver => {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    service: 's3',
  })

  const toUrl = (key: string): string => {
    assertStorageKey(key)
    const endpoint = new URL(config.endpoint)
    if (config.forcePathStyle) {
      return `${endpoint.origin}/${config.bucket}/${key}`
    }
    return `${endpoint.protocol}//${config.bucket}.${endpoint.host}/${key}`
  }

  const send = async (url: string, init: RequestInit): Promise<Response> =>
    sendRequest(await client.sign(url, init))

  const toFailure = (action: string, response: Response): GlobalError =>
    new GlobalError(`Storage ${action} failed`, StatusCodes.BAD_GATEWAY, {
      status: response.status,
    })

  return {
    put: async (key, body, contentType) => {
      const response = await send(toUrl(key), {
        method: 'PUT',
        headers: { 'content-type': contentType },
        body: new Uint8Array(body),
      })
      if (!response.ok) {
        throw toFailure('put', response)
      }
    },
    get: async (key, options) => {
      const range = options?.range
      const response = await send(toUrl(key), {
        method: 'GET',
        headers: range ? { range: `bytes=${range.start}-${range.end ?? ''}` } : {},
      })
      if (response.status === StatusCodes.NOT_FOUND) {
        return null
      }
      if (!response.ok) {
        throw toFailure('get', response)
      }
      const body = new Uint8Array(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') ?? FALLBACK_CONTENT_TYPE
      const contentRange = parseContentRange(response.headers.get('content-range'))
      if (!range || !contentRange) {
        return { body, contentType, size: body.byteLength }
      }
      return {
        body,
        contentType,
        size: contentRange.total,
        range: { start: contentRange.start, end: contentRange.end },
      }
    },
    delete: async (key) => {
      const response = await send(toUrl(key), { method: 'DELETE' })
      if (!response.ok && response.status !== StatusCodes.NOT_FOUND) {
        throw toFailure('delete', response)
      }
    },
  }
}
