import { File } from 'node:buffer'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { PayloadTooLargeError, ValidationError } from '@/server/errors/http-errors'

import { readMultipart } from './multipart'

const createUpload = () => {
  const body =
    '--BlogramBoundary6585683\r\nContent-Disposition: form-data; name="text"\r\n\r\nA bounded upload\r\n--BlogramBoundary6585683\r\nContent-Disposition: form-data; name="file"; filename="photo.webp"\r\nContent-Type: image/webp\r\n\r\nimage-content\r\n--BlogramBoundary6585683--\r\n'
  return new Request('http://localhost:3000/api/admin/posts', {
    method: 'POST',
    body,
    headers: { 'content-type': 'multipart/form-data; boundary=BlogramBoundary6585683' },
  })
}

describe('Bounded multipart parsing', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('Given a valid bounded upload, should preserve fields and file bytes', async () => {
    vi.stubGlobal('File', File)
    const form = await readMultipart(createUpload(), 65536)
    const file = form.get('file')

    expect(form.get('text')).toBe('A bounded upload')
    expect(file).toBeInstanceOf(File)
    if (!file || typeof file === 'string') {
      throw new TypeError('Expected a parsed file')
    }
    expect(await file.text()).toBe('image-content')
  })

  it('Given a declared body exceeding the limit, should reject before consuming the stream', async () => {
    const request = createUpload()
    request.headers.set('content-length', '1000000')
    const body = request.body
    if (!body) {
      throw new TypeError('Expected a request stream')
    }
    const getReader = vi.spyOn(body, 'getReader')

    await expect(readMultipart(request, 1024)).rejects.toBeInstanceOf(PayloadTooLargeError)

    expect(getReader).not.toHaveBeenCalled()
  })

  it('Given chunked data without content length, should cancel when actual bytes exceed the limit', async () => {
    const cancel = vi.fn()
    const body = new ReadableStream({
      pull: (controller) => controller.enqueue(new Uint8Array(512)),
      cancel,
    })
    const options: RequestInit & { duplex: 'half' } = {
      method: 'POST',
      body,
      duplex: 'half',
      headers: { 'content-type': 'multipart/form-data; boundary=upload' },
    }

    await expect(
      readMultipart(new Request('http://localhost:3000/upload', options), 1024),
    ).rejects.toBeInstanceOf(PayloadTooLargeError)

    expect(cancel).toHaveBeenCalledOnce()
  })

  it('Given a dishonest small content length, should still enforce the actual byte limit', async () => {
    const request = createUpload()
    request.headers.set('content-length', '1')

    await expect(readMultipart(request, 10)).rejects.toBeInstanceOf(PayloadTooLargeError)
  })

  it('Given malformed multipart data or a different content type, should reject with validation failure', async () => {
    await expect(
      readMultipart(
        new Request('http://localhost:3000/upload', {
          method: 'POST',
          body: 'malformed',
          headers: { 'content-type': 'multipart/form-data' },
        }),
        1024,
      ),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      readMultipart(
        new Request('http://localhost:3000/upload', { method: 'POST', body: 'body' }),
        1024,
      ),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
