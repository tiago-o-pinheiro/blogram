import * as Models from '@/models/models'

import { API_URL } from '@/lib/api-url'

export class SettingsApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Settings request failed with status ${status}`)
    this.name = 'SettingsApiError'
    this.status = status
  }
}

export const saveSettings = async (input: Models.SiteSettings): Promise<Models.SiteSettings> => {
  const response = await fetch(`${API_URL}/admin/settings`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new SettingsApiError(response.status)
  }
  const data: unknown = await response.json()
  if (!Models.isSiteSettings(data)) {
    throw new SettingsApiError(response.status)
  }
  return data
}
