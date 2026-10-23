import * as Models from '@/models/models'

import { API_URL } from '@/lib/api-url'

export class SetupApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Setup request failed with status ${status}`)
    this.name = 'SetupApiError'
    this.status = status
  }
}

type FinalizeResult = { redirectTo: string }

const isFinalizeResult = (value: unknown): value is FinalizeResult =>
  typeof value === 'object' &&
  value !== null &&
  'redirectTo' in value &&
  typeof value.redirectTo === 'string'

const request = async (path: string, init: RequestInit): Promise<Response> => {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'same-origin' })
  if (!response.ok) {
    throw new SetupApiError(response.status)
  }
  return response
}

const sendJson = (path: string, method: string, body: unknown): Promise<Response> =>
  request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const readProfile = async (response: Response): Promise<Models.Profile> => {
  const data: unknown = await response.json()
  if (!Models.isProfile(data)) {
    throw new SetupApiError(response.status)
  }
  return data
}

export const fetchSetupState = async (): Promise<Models.SetupState> => {
  const response = await request('/setup', { method: 'GET' })
  const data: unknown = await response.json()
  if (!Models.isSetupState(data)) {
    throw new SetupApiError(response.status)
  }
  return data
}

export const unlockSetup = async (input: Models.SetupUnlock): Promise<void> => {
  await sendJson('/setup/unlock', 'POST', input)
}

export const saveSetupProfile = async (input: Models.ProfileBundle): Promise<Models.Profile> =>
  readProfile(await sendJson('/setup/profile', 'PUT', input))

export const uploadSetupPhoto = async (file: File): Promise<Models.Profile> => {
  const body = new FormData()
  body.append('file', file)
  return readProfile(await request('/setup/profile/photo', { method: 'POST', body }))
}

export const finalizeSetup = async (input: Models.SetupOwner): Promise<FinalizeResult> => {
  const response = await sendJson('/setup/finalize', 'POST', input)
  const data: unknown = await response.json()
  if (!isFinalizeResult(data)) {
    throw new SetupApiError(response.status)
  }
  return data
}
