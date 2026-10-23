import { describe, expect, it, vi } from 'vitest'

import { createStorageKey } from './driver'
import { createS3Driver, type S3Config } from './s3-driver'

const CONFIG: S3Config = {
  endpoint: 'https://objects.example.com',
  region: 'auto',
  bucket: 'media',
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret-key',
  forcePathStyle: true,
}

const createRecorder = (response: Response) => {
  const requests: Request[] = []
  const sendRequest = vi.fn(async (request: Request) => {
    requests.push(request)
    return response
  })
  return { requests, sendRequest }
}

describe('createS3Driver', () => {
  it('Given path-style config, should PUT a SigV4-signed request to the endpoint', async () => {
    const { requests, sendRequest } = createRecorder(new Response(null, { status: 200 }))
    const key = createStorageKey('profile', 'webp')

    await createS3Driver(CONFIG, sendRequest).put(key, new Uint8Array([1, 2]), 'image/webp')

    const [request] = requests
    expect(request?.method).toBe('PUT')
    expect(request?.url).toBe(`https://objects.example.com/media/${key}`)
    expect(request?.headers.get('authorization')).toMatch(
      /^AWS4-HMAC-SHA256 Credential=test-access-key\/\d{8}\/auto\/s3\/aws4_request/,
    )
    expect(request?.headers.get('content-type')).toBe('image/webp')
  })

  it('Given virtual-hosted config, should put the bucket in the host', async () => {
    const { requests, sendRequest } = createRecorder(new Response(null, { status: 200 }))
    const key = createStorageKey('profile', 'webp')

    await createS3Driver({ ...CONFIG, forcePathStyle: false }, sendRequest).put(
      key,
      new Uint8Array([1]),
      'image/webp',
    )

    expect(requests[0]?.url).toBe(`https://media.objects.example.com/${key}`)
  })

  it('Given an existing object, should get its bytes and content type', async () => {
    const { sendRequest } = createRecorder(
      new Response(new Uint8Array([7, 8, 9]), { headers: { 'content-type': 'image/webp' } }),
    )

    const object = await createS3Driver(CONFIG, sendRequest).get(
      createStorageKey('profile', 'webp'),
    )

    expect(object).toEqual({ body: new Uint8Array([7, 8, 9]), contentType: 'image/webp', size: 3 })
  })

  it('Given a missing object, should get null', async () => {
    const { sendRequest } = createRecorder(new Response(null, { status: 404 }))

    expect(
      await createS3Driver(CONFIG, sendRequest).get(createStorageKey('profile', 'webp')),
    ).toBeNull()
  })

  it('Given a missing object, should delete without failing', async () => {
    const { sendRequest } = createRecorder(new Response(null, { status: 404 }))

    await expect(
      createS3Driver(CONFIG, sendRequest).delete(createStorageKey('profile', 'webp')),
    ).resolves.toBeUndefined()
  })

  it('Given a server error, should throw', async () => {
    const { sendRequest } = createRecorder(new Response(null, { status: 500 }))

    await expect(
      createS3Driver(CONFIG, sendRequest).put(
        createStorageKey('profile', 'webp'),
        new Uint8Array([1]),
        'image/webp',
      ),
    ).rejects.toThrow('Storage put failed')
  })

  it('Given a key that is not server-shaped, should reject it before any request', async () => {
    const { sendRequest } = createRecorder(new Response(null, { status: 200 }))

    await expect(createS3Driver(CONFIG, sendRequest).get('../escape.webp')).rejects.toThrow()
    expect(sendRequest).not.toHaveBeenCalled()
  })
})
