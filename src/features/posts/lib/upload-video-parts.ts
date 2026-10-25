import type * as Models from '@/models/models'

import { PostsApiError } from '../api/posts-api'
import { abortVideoUpload, completeVideoUpload, startVideoUpload } from '../api/video-upload-api'

export type PartTransport = (request: {
  url: string
  body: Blob
  signal?: AbortSignal
  onProgress: (loaded: number) => void
}) => Promise<{ status: number; etag: string | null }>

export const PART_CONCURRENCY = 3
export const PART_ATTEMPTS = 5
const PART_TIMEOUT_MS = 180000
const BACKOFF_BASE_MS = 1000
const BACKOFF_CAP_MS = 15000

const isRetryableStatus = (status: number): boolean =>
  status === 0 || status === 408 || status === 429 || status >= 500

const waitMs = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const waitForOnline = (): Promise<void> =>
  new Promise((resolve) => {
    window.addEventListener('online', () => resolve(), { once: true })
  })

export const sendPartWithXhr: PartTransport = ({ url, body, signal, onProgress }) =>
  new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    const finish = (status: number, etag: string | null) => resolve({ status, etag })
    xhr.open('PUT', url)
    xhr.timeout = PART_TIMEOUT_MS
    xhr.upload.onprogress = (event) => onProgress(event.loaded)
    xhr.onload = () => finish(xhr.status, xhr.getResponseHeader('ETag'))
    xhr.onerror = () => finish(0, null)
    xhr.ontimeout = () => finish(0, null)
    xhr.onabort = () => finish(0, null)
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(body)
  })

type UploadVideoPartsInput = {
  file: File
  session: Models.VideoUploadSession
  onProgress: (fraction: number) => void
  signal?: AbortSignal
  transport?: PartTransport
  wait?: (ms: number) => Promise<void>
}

export const uploadVideoParts = async ({
  file,
  session,
  onProgress,
  signal,
  transport = sendPartWithXhr,
  wait = waitMs,
}: UploadVideoPartsInput): Promise<Models.VideoUploadEtag[]> => {
  const loadedByPart = new Map<number, number>()
  const etags: Models.VideoUploadEtag[] = []
  const queue = [...session.parts]
  let reported = 0
  let hasFailed = false

  const report = () => {
    let loaded = 0
    for (const value of loadedByPart.values()) {
      loaded += value
    }
    reported = Math.max(reported, Math.min(1, loaded / file.size))
    onProgress(reported)
  }

  const sendPart = async (part: Models.VideoUploadPart): Promise<void> => {
    const start = (part.partNumber - 1) * session.partSize
    const body = file.slice(start, Math.min(start + session.partSize, file.size))
    let lastStatus = 0
    for (let attempt = 1; attempt <= PART_ATTEMPTS; attempt += 1) {
      if (hasFailed || signal?.aborted) {
        throw new PostsApiError(0, 'interrupted')
      }
      if (!navigator.onLine) {
        await waitForOnline()
      }
      loadedByPart.set(part.partNumber, 0)
      const { status, etag } = await transport({
        url: part.url,
        body,
        signal,
        onProgress: (loaded) => {
          loadedByPart.set(part.partNumber, Math.min(loaded, body.size))
          report()
        },
      })
      if (status >= 200 && status < 300) {
        if (!etag) {
          throw new PostsApiError(0, 'storageCors')
        }
        loadedByPart.set(part.partNumber, body.size)
        report()
        etags.push({ partNumber: part.partNumber, etag })
        return
      }
      if (!isRetryableStatus(status)) {
        throw new PostsApiError(status, 'interrupted')
      }
      lastStatus = status
      loadedByPart.set(part.partNumber, 0)
      if (attempt < PART_ATTEMPTS) {
        await wait(Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1)))
      }
    }
    throw new PostsApiError(lastStatus, 'interrupted')
  }

  const runWorker = async (): Promise<void> => {
    for (let part = queue.shift(); part; part = queue.shift()) {
      await sendPart(part).catch((error: unknown) => {
        hasFailed = true
        throw error
      })
    }
  }

  const workers = Array.from({ length: Math.min(PART_CONCURRENCY, queue.length) }, runWorker)
  await Promise.all(workers)
  return etags.sort((first, second) => first.partNumber - second.partNumber)
}

export const uploadVideoDirect = async (
  file: File,
  contentType: Models.VideoUploadType,
  onProgress: (fraction: number) => void,
): Promise<Models.VideoUploadReady> => {
  const session = await startVideoUpload({ contentType, size: file.size })
  try {
    const parts = await uploadVideoParts({ file, session, onProgress })
    return await completeVideoUpload(session.id, parts)
  } catch (error) {
    await abortVideoUpload(session.id)
    throw error
  }
}
