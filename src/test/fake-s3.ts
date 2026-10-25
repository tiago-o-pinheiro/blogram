import { createHash, randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { type S3Config } from '@/server/lib/storage/s3-driver'

type StoredObject = { body: Uint8Array; contentType: string }
type PendingUpload = { key: string; contentType: string; parts: Map<number, Uint8Array> }

export type FakeS3 = {
  endpoint: string
  config: S3Config
  listObjects: () => string[]
  listUploads: () => string[]
  putObject: (key: string, body: Uint8Array, contentType: string) => void
  close: () => Promise<void>
}

const BUCKET = 'media'
const PART_PATTERN = /<PartNumber>(\d+)<\/PartNumber><ETag>([^<]*)<\/ETag>/g

const toEtag = (body: Uint8Array): string => `"${createHash('md5').update(body).digest('hex')}"`

const readBody = async (request: IncomingMessage): Promise<Uint8Array> => {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk))
  }
  return new Uint8Array(Buffer.concat(chunks))
}

const send = (
  response: ServerResponse,
  status: number,
  body: string | Uint8Array = '',
  headers: Record<string, string> = {},
): void => {
  response.writeHead(status, { 'content-length': Buffer.byteLength(body), ...headers })
  response.end(body)
}

const sendError = (response: ServerResponse, status: number, code: string): void => {
  send(response, status, `<Error><Code>${code}</Code></Error>`, {
    'content-type': 'application/xml',
  })
}

const parseRange = (header: string, size: number): { start: number; end: number } | null => {
  const match = /^bytes=(\d+)-(\d*)$/.exec(header)
  if (!match) {
    return null
  }
  const start = Number(match[1])
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  return start <= end ? { start, end } : null
}

export const createFakeS3 = async (): Promise<FakeS3> => {
  const objects = new Map<string, StoredObject>()
  const uploads = new Map<string, PendingUpload>()

  const handleMultipart = async (
    request: IncomingMessage,
    response: ServerResponse,
    key: string,
    params: URLSearchParams,
  ): Promise<boolean> => {
    const method = request.method ?? 'GET'
    const uploadId = params.get('uploadId')
    if (method === 'POST' && params.has('uploads')) {
      const id = randomUUID()
      uploads.set(id, {
        key,
        contentType: request.headers['content-type'] ?? 'application/octet-stream',
        parts: new Map(),
      })
      send(
        response,
        200,
        `<InitiateMultipartUploadResult><UploadId>${id}</UploadId></InitiateMultipartUploadResult>`,
      )
      return true
    }
    if (!uploadId) {
      return false
    }
    const upload = uploads.get(uploadId)
    if (!upload || upload.key !== key) {
      await readBody(request)
      sendError(response, 404, 'NoSuchUpload')
      return true
    }
    if (method === 'PUT') {
      const body = await readBody(request)
      upload.parts.set(Number(params.get('partNumber')), body)
      send(response, 200, '', { etag: toEtag(body) })
      return true
    }
    if (method === 'DELETE') {
      uploads.delete(uploadId)
      send(response, 204)
      return true
    }
    if (method === 'POST') {
      const xml = Buffer.from(await readBody(request)).toString('utf8')
      const listed = [...xml.matchAll(PART_PATTERN)].map((match) => ({
        partNumber: Number(match[1]),
        etag: match[2] ?? '',
      }))
      const chunks = listed.map((part) => upload.parts.get(part.partNumber))
      const isValid = listed.every(
        (part, index) =>
          chunks[index] && toEtag(chunks[index]) === part.etag.replaceAll('&quot;', '"'),
      )
      if (!isValid || listed.length === 0) {
        sendError(response, 400, 'InvalidPart')
        return true
      }
      const body = new Uint8Array(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk ?? []))))
      objects.set(key, { body, contentType: upload.contentType })
      uploads.delete(uploadId)
      send(response, 200, '<CompleteMultipartUploadResult></CompleteMultipartUploadResult>')
      return true
    }
    return false
  }

  const handleObject = async (
    request: IncomingMessage,
    response: ServerResponse,
    key: string,
  ): Promise<void> => {
    const method = request.method ?? 'GET'
    if (method === 'PUT') {
      const body = await readBody(request)
      objects.set(key, {
        body,
        contentType: request.headers['content-type'] ?? 'application/octet-stream',
      })
      send(response, 200, '', { etag: toEtag(body) })
      return
    }
    if (method === 'DELETE') {
      objects.delete(key)
      send(response, 204)
      return
    }
    const stored = objects.get(key)
    if (!stored) {
      sendError(response, 404, 'NoSuchKey')
      return
    }
    const headers = {
      'content-type': stored.contentType,
      'accept-ranges': 'bytes',
      etag: toEtag(stored.body),
    }
    if (method === 'HEAD') {
      response.writeHead(200, { ...headers, 'content-length': stored.body.byteLength })
      response.end()
      return
    }
    const range = request.headers.range
      ? parseRange(request.headers.range, stored.body.byteLength)
      : null
    if (!range) {
      send(response, 200, stored.body, headers)
      return
    }
    send(response, 206, stored.body.slice(range.start, range.end + 1), {
      ...headers,
      'content-range': `bytes ${range.start}-${range.end}/${stored.body.byteLength}`,
    })
  }

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const prefix = `/${BUCKET}/`
    if (!url.pathname.startsWith(prefix)) {
      sendError(response, 404, 'NoSuchBucket')
      return
    }
    const key = url.pathname.slice(prefix.length)
    handleMultipart(request, response, key, url.searchParams)
      .then((isHandled) => (isHandled ? undefined : handleObject(request, response, key)))
      .catch(() => sendError(response, 500, 'InternalError'))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  const endpoint = `http://127.0.0.1:${port}`

  return {
    endpoint,
    config: {
      endpoint,
      region: 'auto',
      bucket: BUCKET,
      accessKeyId: 'fake-access-key',
      secretAccessKey: 'fake-secret-key',
      forcePathStyle: true,
    },
    listObjects: () => [...objects.keys()],
    listUploads: () => [...uploads.keys()],
    putObject: (key, body, contentType) => {
      objects.set(key, { body, contentType })
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
