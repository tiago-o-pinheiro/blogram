import { Buffer } from 'node:buffer'

import { PayloadTooLargeError, ValidationError } from '@/server/errors/http-errors'

export const MULTIPART_OVERHEAD_BYTES = 65536

export const readMultipart = async (request: Request, maxBytes: number): Promise<FormData> => {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.split(';')[0]?.trim().toLowerCase() !== 'multipart/form-data') {
    throw new ValidationError('Request body must be multipart form data')
  }
  const declaredBytes = request.headers.get('content-length')
  if (declaredBytes && /^\d+$/.test(declaredBytes) && Number(declaredBytes) > maxBytes) {
    throw new PayloadTooLargeError('Upload body is too large')
  }
  if (!request.body) {
    throw new ValidationError('Request body must be multipart form data')
  }
  const reader = request.body.getReader()
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let bytes = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) {
        break
      }
      bytes += chunk.value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new PayloadTooLargeError('Upload body is too large')
      }
      chunks.push(new Uint8Array(chunk.value))
    }
  } finally {
    reader.releaseLock()
  }
  const payload = Buffer.alloc(bytes)
  let offset = 0
  for (const chunk of chunks) {
    payload.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new Response(payload, { headers: { 'content-type': contentType } })
    .formData()
    .catch(() => {
      throw new ValidationError('Request body must be multipart form data')
    })
}
