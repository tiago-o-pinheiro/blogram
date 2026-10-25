import * as Models from '@/models/models'

import { API_URL } from '@/lib/api-url'

import { PostsApiError } from './posts-api'

const sendJson = async (path: string, method: string, body?: unknown): Promise<Response> => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      throw new PostsApiError(0, 'interrupted')
    }
    throw error
  })
  if (!response.ok) {
    throw new PostsApiError(response.status)
  }
  return response
}

export const startVideoUpload = async (
  input: Models.VideoUploadStart,
): Promise<Models.VideoUploadSession> => {
  const response = await sendJson('/admin/uploads/video', 'POST', input)
  const session: unknown = await response.json()
  if (!Models.isVideoUploadSession(session)) {
    throw new PostsApiError(response.status)
  }
  return session
}

export const completeVideoUpload = async (
  id: string,
  parts: Models.VideoUploadEtag[],
): Promise<Models.VideoUploadReady> => {
  const response = await sendJson(`/admin/uploads/video/${id}/complete`, 'POST', { parts })
  const ready: unknown = await response.json()
  if (!Models.isVideoUploadReady(ready)) {
    throw new PostsApiError(response.status)
  }
  return ready
}

export const abortVideoUpload = async (id: string): Promise<void> => {
  await sendJson(`/admin/uploads/video/${id}`, 'DELETE').catch(() => undefined)
}
