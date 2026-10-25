import { createServer, type Server } from 'node:http'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createWebm } from '@/test/video-fixtures'

import { inspectVideo, inspectVideoUrl } from './video'

const serveBytes = (server: Server, files: Record<string, Uint8Array>) => {
  server.on('request', (request, response) => {
    const bytes = files[request.url ?? '']
    if (!bytes) {
      response.writeHead(404).end()
      return
    }
    const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range ?? '')
    if (!range?.[1]) {
      response.writeHead(200, { 'content-length': bytes.length, 'accept-ranges': 'bytes' })
      response.end(bytes)
      return
    }
    const start = Number(range[1])
    const end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1
    response.writeHead(206, {
      'content-length': end - start + 1,
      'content-range': `bytes ${start}-${end}/${bytes.length}`,
      'accept-ranges': 'bytes',
    })
    response.end(bytes.subarray(start, end + 1))
  })
}

describe('inspectVideoUrl', () => {
  const server = createServer()
  let baseUrl = ''
  let webm: Uint8Array

  beforeAll(async () => {
    webm = await createWebm()
    serveBytes(server, {
      '/clip.webm': webm,
      '/note.txt': new TextEncoder().encode('this is not a video at all'),
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Test server has no port')
    }
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('Given a webm served over http, should read its type and dimensions', async () => {
    const fromBytes = await inspectVideo(webm)

    await expect(inspectVideoUrl(`${baseUrl}/clip.webm`)).resolves.toEqual(fromBytes)
  })

  it('Given a text file served over http, should reject it as an invalid video', async () => {
    await expect(inspectVideoUrl(`${baseUrl}/note.txt`)).rejects.toMatchObject({ statusCode: 422 })
  })
})
