import {
  SETUP_COOKIE_NAME,
  setupSessionService,
} from '@/server/modules/setup/services/setup-session.service'

export const createSetupCookie = async (): Promise<string> => {
  const { token } = await setupSessionService.create()
  return `${SETUP_COOKIE_NAME}=${token}`
}
