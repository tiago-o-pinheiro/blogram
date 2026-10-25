import { AwsClient } from 'aws4fetch'
import { StatusCodes } from 'http-status-codes'

import { GlobalError } from '@/server/errors/global-error'
import { ValidationError } from '@/server/errors/http-errors'

import { assertStorageKey, type DirectUploadDriver, type StorageDriver } from './driver'

export type S3Config = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

export type FetchLike = (request: Request) => Promise<Response>

const FALLBACK_CONTENT_TYPE = 'application/octet-stream'

const CONTENT_RANGE_PATTERN = /^bytes (\d+)-(\d+)\/(\d+)$/

const UPLOAD_ID_PATTERN = /<UploadId>([^<]+)<\/UploadId>/

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char)

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
): StorageDriver & DirectUploadDriver => {
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

  const presign = async (
    url: string,
    method: string,
    expiresInSeconds: number,
  ): Promise<string> => {
    const target = new URL(url)
    target.searchParams.set('X-Amz-Expires', String(expiresInSeconds))
    const signed = await client.sign(target.toString(), { method, aws: { signQuery: true } })
    return signed.url
  }

  const withQuery = (key: string, query: Record<string, string>): string => {
    const target = new URL(toUrl(key))
    Object.entries(query).forEach(([name, value]) => target.searchParams.set(name, value))
    return target.toString()
  }

  return {
    put: async (key, body, contentType) => {
      const response = await send(toUrl(key), {
        method: 'PUT',
        headers: {
          'content-type': contentType,
          'content-length': String(body.byteLength),
        },
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
    createMultipartUpload: async (key, contentType) => {
      const response = await send(withQuery(key, { uploads: '' }), {
        method: 'POST',
        headers: { 'content-type': contentType },
      })
      if (!response.ok) {
        throw toFailure('create multipart', response)
      }
      const uploadId = UPLOAD_ID_PATTERN.exec(await response.text())?.[1]
      if (!uploadId) {
        throw new GlobalError('Storage create multipart failed', StatusCodes.BAD_GATEWAY)
      }
      return uploadId
    },
    presignUploadPart: async (key, uploadId, partNumber, expiresInSeconds) =>
      presign(
        withQuery(key, { partNumber: String(partNumber), uploadId }),
        'PUT',
        expiresInSeconds,
      ),
    completeMultipartUpload: async (key, uploadId, parts) => {
      const items = parts
        .map(
          (part) =>
            `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${escapeXml(part.etag)}</ETag></Part>`,
        )
        .join('')
      const response = await send(withQuery(key, { uploadId }), {
        method: 'POST',
        headers: { 'content-type': 'application/xml' },
        body: `<CompleteMultipartUpload>${items}</CompleteMultipartUpload>`,
      })
      if (response.status >= 400 && response.status < 500) {
        throw new ValidationError('Multipart upload could not be completed')
      }
      if (!response.ok) {
        throw toFailure('complete multipart', response)
      }
      if ((await response.text()).includes('<Error>')) {
        throw toFailure('complete multipart', response)
      }
    },
    abortMultipartUpload: async (key, uploadId) => {
      const response = await send(withQuery(key, { uploadId }), { method: 'DELETE' })
      if (!response.ok && response.status !== StatusCodes.NOT_FOUND) {
        throw toFailure('abort multipart', response)
      }
    },
    head: async (key) => {
      const response = await send(toUrl(key), { method: 'HEAD' })
      if (response.status === StatusCodes.NOT_FOUND) {
        return null
      }
      if (!response.ok) {
        throw toFailure('head', response)
      }
      return {
        size: Number(response.headers.get('content-length') ?? 0),
        contentType: response.headers.get('content-type') ?? FALLBACK_CONTENT_TYPE,
      }
    },
    presignGet: async (key, expiresInSeconds) => presign(toUrl(key), 'GET', expiresInSeconds),
  }
}
