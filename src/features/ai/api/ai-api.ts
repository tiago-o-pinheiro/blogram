import * as Models from '@/models/models'

import { API_URL } from '@/lib/api-url'

export class AiApiError extends Error {
  readonly status: number
  readonly reason: string | null

  constructor(status: number, reason: string | null = null) {
    super(`AI request failed with status ${status}`)
    this.name = 'AiApiError'
    this.status = status
    this.reason = reason
  }
}

type AiDraftInput = Models.AiDraftRequest & { file?: File }

const readReason = async (response: Response): Promise<string | null> => {
  const body: unknown = await response.json().catch(() => null)
  if (typeof body !== 'object' || body === null || !('details' in body)) {
    return null
  }
  const { details } = body
  if (typeof details !== 'object' || details === null || !('reason' in details)) {
    return null
  }
  return typeof details.reason === 'string' ? details.reason : null
}

const request = async (path: string, init: RequestInit): Promise<Response> => {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'same-origin' })
  if (!response.ok) {
    throw new AiApiError(response.status, await readReason(response))
  }
  return response
}

export const saveAiSettings = async (
  update: Models.AiSettingsUpdate,
): Promise<Models.AiSettings> => {
  const response = await request('/admin/ai/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(update),
  })
  const data: unknown = await response.json()
  if (!Models.isAiSettings(data)) {
    throw new AiApiError(response.status)
  }
  return data
}

export const requestAiDraft = async (input: AiDraftInput): Promise<Models.AiDraft> => {
  const body = new FormData()
  body.append('prompt', input.prompt)
  body.append('postType', input.postType)
  for (const field of input.fields) {
    body.append('field', field)
  }
  body.append('title', input.title)
  body.append('altText', input.altText)
  body.append('text', input.text)
  if (input.mediaId) {
    body.append('mediaId', input.mediaId)
  }
  if (input.file) {
    body.append('file', input.file)
  }
  const response = await request('/admin/ai/draft', { method: 'POST', body })
  const data: unknown = await response.json()
  if (!Models.isAiDraft(data)) {
    throw new AiApiError(response.status)
  }
  return data
}
