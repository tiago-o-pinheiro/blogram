import { headers } from 'next/headers'

import { authService } from '@/server/modules/auth/services/auth.service'

import { GoogleAccountControls } from './google-account-controls'

export const GoogleAccount = async () => {
  const account = await authService.getGoogleAccount(await headers())
  return account ? <GoogleAccountControls {...account} /> : null
}
