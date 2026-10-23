import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { type Models } from '@/models'

import { authService } from '@/server/modules/auth/services/auth.service'

export const SIGN_IN_PATH = '/sign-in'

export const requireOwnerPage = async (): Promise<Models.User> => {
  const user = await authService.findUser(await headers())
  if (!user) {
    redirect(SIGN_IN_PATH)
  }
  return user
}
