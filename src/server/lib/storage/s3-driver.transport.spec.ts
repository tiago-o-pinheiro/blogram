import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'

import { describe, expect, it } from 'vitest'

import { createStorageKey } from './driver'
import { createS3Driver } from './s3-driver'

const createObjectServer = async (size: number) => {
  const chunks: Uint8Array[] = []
  const server = createServer((request, response) => {
    request.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    request.on('end', () => {
      response.writeHead(request.headers['content-length'] === String(size) ? 200 : 411)
      response.end()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Object server did not bind a port')
  }
  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    readBody: () => Buffer.concat(chunks),
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  }
}

describe('S3 upload transport', () => {
  it('Given a request rebuilt as a stream, should upload every binary byte', async () => {
    const bytes = randomBytes(150000)
    const server = await createObjectServer(bytes.byteLength)
    const driver = createS3Driver(
      {
        endpoint: server.endpoint,
        region: 'auto',
        bucket: 'media',
        accessKeyId: '::access-key::',
        secretAccessKey: '::secret-key::',
        forcePathStyle: true,
      },
      (request) => {
        const init = {
          method: request.method,
          headers: request.headers,
          body: request.body,
          duplex: 'half',
        }
        return fetch(new Request(request.url, init))
      },
    )

    try {
      await driver.put(createStorageKey('profile', 'webp'), bytes, 'image/webp')

      expect(server.readBody()).toEqual(bytes)
    } finally {
      await server.close()
    }
  })
})
