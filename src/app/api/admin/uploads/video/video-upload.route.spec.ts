// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { POST as postComplete } from '@/app/api/admin/uploads/video/[id]/complete/route'
import { DELETE as deleteUpload } from '@/app/api/admin/uploads/video/[id]/route'
import { POST as postStart } from '@/app/api/admin/uploads/video/route'
import { withErrorHandler } from '@/server/errors/with-error-handler'
import { type RouteHandler } from '@/server/lib/handler'
import { createS3Driver } from '@/server/lib/storage/s3-driver'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { VideoUploadController } from '@/server/modules/media/controllers/video-upload.controller'
import { MediaCleanupService } from '@/server/modules/media/services/media-cleanup.service'
import { VideoUploadService } from '@/server/modules/media/services/video-upload.service'
import { createOwnerSession } from '@/test/auth-session'
import { createFakeS3, type FakeS3 } from '@/test/fake-s3'

const BASE_URL = 'http://localhost:3000/api/admin/uploads/video'
const UNKNOWN_ID = '0b0f3f0e-6f1d-4c5e-9d57-0f4b1e0a9c11'
const BYTES = new Uint8Array([1, 2, 3])

const send = (url: string, method: string, body?: unknown, cookie?: string) =>
  new Request(url, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const idContext = (id: string) => ({ params: Promise.resolve({ id }) })

describe('video upload routes on the local driver', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
  })

  it('Given no session, should answer 401 on every route', async () => {
    const responses = await Promise.all([
      postStart(send(BASE_URL, 'POST', { contentType: 'video/webm', size: 3 })),
      postComplete(
        send(`${BASE_URL}/${UNKNOWN_ID}/complete`, 'POST', { parts: [] }),
        idContext(UNKNOWN_ID),
      ),
      deleteUpload(send(`${BASE_URL}/${UNKNOWN_ID}`, 'DELETE'), idContext(UNKNOWN_ID)),
    ])

    expect(responses.map((response) => response.status)).toEqual([
      StatusCodes.UNAUTHORIZED,
      StatusCodes.UNAUTHORIZED,
      StatusCodes.UNAUTHORIZED,
    ])
  })

  it('Given the local driver, should answer 409 on start', async () => {
    const response = await postStart(
      send(BASE_URL, 'POST', { contentType: 'video/webm', size: 3 }, cookie),
    )

    expect(response.status).toBe(StatusCodes.CONFLICT)
  })

  it('Given an invalid body, should answer 422 on start', async () => {
    const response = await postStart(
      send(BASE_URL, 'POST', { contentType: 'video/avi', size: 0 }, cookie),
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })
})

describe('video upload routes on the s3 driver', () => {
  let fake: FakeS3
  let cookie: string
  let start: RouteHandler
  let complete: (request: Request, id: string) => ReturnType<RouteHandler>
  let abort: (request: Request, id: string) => ReturnType<RouteHandler>

  beforeEach(async () => {
    fake = await createFakeS3()
    cookie = await createOwnerSession()
    const driver = createS3Driver(fake.config)
    const controller = new VideoUploadController(
      new VideoUploadService({
        getUploads: () => driver,
        getMaxVideoBytes: () => 1_000_000_000,
        inspectUrl: async () => ({ width: 64, height: 96, contentType: 'video/webm' }),
        cleanup: new MediaCleanupService(driver),
      }),
    )
    start = withErrorHandler(requireSession(controller.start))
    const completeHandler = withErrorHandler(requireSession(controller.complete))
    const abortHandler = withErrorHandler(requireSession(controller.abort))
    complete = (request, id) => completeHandler(request, idContext(id))
    abort = (request, id) => abortHandler(request, idContext(id))
  })

  afterEach(async () => {
    await fake.close()
  })

  const startSession = async (): Promise<Models.VideoUploadSession> => {
    const response = await start(
      send(BASE_URL, 'POST', { contentType: 'video/webm', size: BYTES.byteLength }, cookie),
    )
    const session: unknown = await response.json()
    if (!Models.isVideoUploadSession(session)) {
      throw new Error('Unexpected session')
    }
    expect(response.status).toBe(StatusCodes.CREATED)
    expect(response.headers.get('cache-control')).toBe('no-store')
    return session
  }

  const putFirstPart = async (session: Models.VideoUploadSession): Promise<string> => {
    const [part] = session.parts
    const response = await fetch(part?.url ?? '', { method: 'PUT', body: BYTES })
    return response.headers.get('etag') ?? ''
  }

  it('Given a started upload, should accept parts and answer the ready video on complete', async () => {
    const session = await startSession()
    const etag = await putFirstPart(session)

    const response = await complete(
      send(
        `${BASE_URL}/${session.id}/complete`,
        'POST',
        { parts: [{ partNumber: 1, etag }] },
        cookie,
      ),
      session.id,
    )

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({
      id: session.id,
      contentType: 'video/webm',
      size: BYTES.byteLength,
      width: 64,
      height: 96,
    })
  })

  it('Given an ETag with markup, should answer 422 on complete', async () => {
    const session = await startSession()

    const response = await complete(
      send(
        `${BASE_URL}/${session.id}/complete`,
        'POST',
        { parts: [{ partNumber: 1, etag: '<bad>' }] },
        cookie,
      ),
      session.id,
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given a pending upload, should answer 204 on delete and drop the multipart upload', async () => {
    const session = await startSession()

    const response = await abort(
      send(`${BASE_URL}/${session.id}`, 'DELETE', undefined, cookie),
      session.id,
    )

    expect(response.status).toBe(StatusCodes.NO_CONTENT)
    expect(fake.listUploads()).toEqual([])
  })

  it('Given an unknown id, should answer 404 on complete and delete', async () => {
    const responses = await Promise.all([
      complete(
        send(
          `${BASE_URL}/${UNKNOWN_ID}/complete`,
          'POST',
          { parts: [{ partNumber: 1, etag: '"abc"' }] },
          cookie,
        ),
        UNKNOWN_ID,
      ),
      abort(send(`${BASE_URL}/${UNKNOWN_ID}`, 'DELETE', undefined, cookie), UNKNOWN_ID),
    ])

    expect(responses.map((response) => response.status)).toEqual([
      StatusCodes.NOT_FOUND,
      StatusCodes.NOT_FOUND,
    ])
  })
})
