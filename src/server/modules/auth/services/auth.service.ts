import { type Models } from '@/models'

import { auth } from '@/server/lib/auth'

export class AuthService {
  handle = (request: Request): Promise<Response> => auth.handler(request)

  findUser = async (headers: Headers): Promise<Models.User | null> => {
    const session = await auth.api.getSession({ headers })
    if (!session) {
      return null
    }
    const { id, name, email } = session.user
    return { id, name, email }
  }
}

export const authService = new AuthService()
