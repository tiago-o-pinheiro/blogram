import * as Models from '@/models/models'

import { API_URL } from '@/lib/api-url'

export class ProfileApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Profile request failed with status ${status}`)
    this.name = 'ProfileApiError'
    this.status = status
  }
}

const request = async (path: string, init: RequestInit): Promise<Response> => {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'same-origin' })
  if (!response.ok) {
    throw new ProfileApiError(response.status)
  }
  return response
}

const readProfile = async (response: Response): Promise<Models.Profile> => {
  const data: unknown = await response.json()
  if (!Models.isProfile(data)) {
    throw new ProfileApiError(response.status)
  }
  return data
}

export const saveProfile = async (input: Models.ProfileBundle): Promise<Models.Profile> =>
  readProfile(
    await request('/admin/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),
  )

export const uploadProfilePhoto = async (file: File): Promise<Models.Profile> => {
  const body = new FormData()
  body.append('file', file)
  return readProfile(await request('/admin/profile/photo', { method: 'POST', body }))
}
