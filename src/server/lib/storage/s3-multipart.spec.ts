import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ValidationError } from '@/server/errors/http-errors'
import { createFakeS3, type FakeS3 } from '@/test/fake-s3'

import { createStorageKey } from './driver'
import { createS3Driver } from './s3-driver'

let fake: FakeS3

beforeAll(async () => {
  fake = await createFakeS3()
})

afterAll(async () => {
  await fake.close()
})

const putPart = async (url: string, body: Uint8Array): Promise<string> => {
  const response = await fetch(url, { method: 'PUT', body: new Uint8Array(body) })
  return response.headers.get('etag') ?? ''
}

describe('S3 multipart uploads', () => {
  it('Given a presigned part URL, should carry the expiry and a signature', async () => {
    const driver = createS3Driver(fake.config)
    const key = createStorageKey('videos', 'webm')
    const uploadId = await driver.createMultipartUpload(key, 'video/webm')

    const url = new URL(await driver.presignUploadPart(key, uploadId, 1, 600))

    expect(url.searchParams.get('X-Amz-Expires')).toBe('600')
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
    expect(url.searchParams.get('partNumber')).toBe('1')
    expect(url.searchParams.get('uploadId')).toBe(uploadId)
  })

  it('Given two uploaded parts, should complete, head and read the object back', async () => {
    const driver = createS3Driver(fake.config)
    const key = createStorageKey('videos', 'webm')
    const uploadId = await driver.createMultipartUpload(key, 'video/webm')
    const first = new Uint8Array([1, 2, 3])
    const second = new Uint8Array([4, 5])

    const parts = [
      {
        partNumber: 1,
        etag: await putPart(await driver.presignUploadPart(key, uploadId, 1, 600), first),
      },
      {
        partNumber: 2,
        etag: await putPart(await driver.presignUploadPart(key, uploadId, 2, 600), second),
      },
    ]
    await driver.completeMultipartUpload(key, uploadId, parts)

    expect(await driver.head(key)).toEqual({ size: 5, contentType: 'video/webm' })
    const ranged = await fetch(await driver.presignGet(key, 300), {
      headers: { range: 'bytes=1-2' },
    })
    expect([...new Uint8Array(await ranged.arrayBuffer())]).toEqual([2, 3])
    expect(fake.listUploads()).not.toContain(uploadId)
  })

  it('Given a pending upload, should abort it and treat a second abort as done', async () => {
    const driver = createS3Driver(fake.config)
    const key = createStorageKey('videos', 'mp4')
    const uploadId = await driver.createMultipartUpload(key, 'video/mp4')

    await driver.abortMultipartUpload(key, uploadId)
    await driver.abortMultipartUpload(key, uploadId)

    expect(fake.listUploads()).not.toContain(uploadId)
  })

  it('Given a missing object, should head null', async () => {
    const driver = createS3Driver(fake.config)

    expect(await driver.head(createStorageKey('videos', 'mp4'))).toBeNull()
  })

  it('Given an unknown part list, should reject complete as a validation error', async () => {
    const driver = createS3Driver(fake.config)
    const key = createStorageKey('videos', 'mp4')
    const uploadId = await driver.createMultipartUpload(key, 'video/mp4')

    await expect(
      driver.completeMultipartUpload(key, uploadId, [{ partNumber: 1, etag: '"bogus"' }]),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('Given a 200 response with an Error body, should fail complete', async () => {
    const driver = createS3Driver(
      fake.config,
      async () => new Response('<Error><Code>InternalError</Code></Error>', { status: 200 }),
    )

    await expect(
      driver.completeMultipartUpload(createStorageKey('videos', 'mp4'), 'id', [
        { partNumber: 1, etag: '"abc"' },
      ]),
    ).rejects.toMatchObject({ statusCode: 502 })
  })

  it('Given an invalid key, should refuse to presign', async () => {
    const driver = createS3Driver(fake.config)

    await expect(driver.presignGet('../etc/passwd', 60)).rejects.toBeInstanceOf(ValidationError)
  })
})
