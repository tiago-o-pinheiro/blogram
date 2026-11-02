import * as Models from '@/models/models'

import { API_URL } from '@/lib/api-url'

export class RecoveryCodesApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Recovery code request failed with status ${status}`)
    this.name = 'RecoveryCodesApiError'
    this.status = status
  }
}

const postJson = async (path: string, body: unknown): Promise<unknown> => {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  }).catch(() => {
    throw new RecoveryCodesApiError(0)
  })
  if (!response.ok) {
    throw new RecoveryCodesApiError(response.status)
  }
  return response.json().catch(() => {
    throw new RecoveryCodesApiError(response.status)
  })
}

export const generateRecoveryCodes = async (password: string): Promise<string[]> => {
  const data = await postJson('/admin/recovery-codes', { password })
  if (!Models.isRecoveryCodeList(data)) {
    throw new RecoveryCodesApiError(0)
  }
  return data.codes
}

export const redeemRecoveryCode = async (
  input: Models.RecoveryCodeRedeem,
): Promise<Models.RecoveryCodeRedeemed> => {
  const data = await postJson('/recovery', input)
  if (!Models.isRecoveryCodeRedeemed(data)) {
    throw new RecoveryCodesApiError(0)
  }
  return data
}
