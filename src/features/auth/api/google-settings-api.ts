import * as Models from '@/models/models'

import { API_URL } from '@/lib/api-url'

export class GoogleSettingsApiError extends Error {
  readonly status: number
  readonly reason: string | null

  constructor(status: number, reason: string | null = null) {
    super(`Google settings request failed with status ${status}`)
    this.name = 'GoogleSettingsApiError'
    this.status = status
    this.reason = reason
  }
}

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

export const saveGoogleSettings = async (
  update: Models.GoogleSignInSettingsUpdate,
): Promise<Models.GoogleSignInSettings> => {
  const response = await fetch(`${API_URL}/admin/google/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(update),
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new GoogleSettingsApiError(response.status, await readReason(response))
  }
  const data: unknown = await response.json()
  if (!Models.isGoogleSignInSettings(data)) {
    throw new GoogleSettingsApiError(response.status)
  }
  return data
}
