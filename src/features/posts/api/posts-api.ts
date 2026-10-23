import * as Models from '@/models/models'

import { API_URL } from '@/lib/api-url'

export class PostsApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Posts request failed with status ${status}`)
    this.name = 'PostsApiError'
    this.status = status
  }
}

type CreatePhotoPostInput = {
  file: File
  text: string
  altText: string
}

type CreatePostInput = {
  type: Models.PostType
  text: string
  altText: string
  file?: File
  poster?: File
  url?: string
  title?: string
  description?: string
  source?: string
}

const request = async (path: string, init: RequestInit): Promise<Response> => {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'same-origin' })
  if (!response.ok) {
    throw new PostsApiError(response.status)
  }
  return response
}

const sendJson = (path: string, method: string, body: unknown): Promise<Response> =>
  request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const readPost = async (response: Response): Promise<Models.Post> => {
  const data: unknown = await response.json()
  if (!Models.isPost(data)) {
    throw new PostsApiError(response.status)
  }
  return data
}

export const createPhotoPost = async (input: CreatePhotoPostInput): Promise<Models.Post> => {
  return createPost({ ...input, type: 'photo' })
}

export const createPost = async (input: CreatePostInput): Promise<Models.Post> => {
  const body = new FormData()
  body.append('type', input.type)
  body.append('text', input.text)
  body.append('altText', input.altText)
  if (input.file) {
    body.append('file', input.file)
  }
  if (input.poster) {
    body.append('poster', input.poster)
  }
  for (const field of ['url', 'title', 'description', 'source'] as const) {
    if (input[field] !== undefined) {
      body.append(field, input[field])
    }
  }
  return readPost(await request('/admin/posts', { method: 'POST', body }))
}

export const fetchLinkMetadata = async (url: string): Promise<Models.LinkMetadata> => {
  const response = await sendJson('/admin/metadata', 'POST', { url })
  const metadata: unknown = await response.json()
  if (!Models.isLinkMetadata(metadata)) {
    throw new PostsApiError(422)
  }
  return metadata
}

export const updatePost = async (id: string, input: Models.PostUpdate): Promise<Models.Post> =>
  readPost(await sendJson(`/admin/posts/${id}`, 'PATCH', input))

export const replacePostImage = async (id: string, file: File): Promise<Models.Post> => {
  const body = new FormData()
  body.append('file', file)
  return readPost(await request(`/admin/posts/${id}/image`, { method: 'PUT', body }))
}

export const replacePostVideo = async (id: string, file: File): Promise<Models.Post> => {
  const body = new FormData()
  body.append('file', file)
  return readPost(await request(`/admin/posts/${id}/video`, { method: 'PUT', body }))
}

export const setPostStatus = async (id: string, status: Models.PostStatus): Promise<Models.Post> =>
  readPost(await sendJson(`/admin/posts/${id}/status`, 'PUT', { status }))

export const deletePost = async (id: string): Promise<void> => {
  await request(`/admin/posts/${id}`, { method: 'DELETE' })
}
