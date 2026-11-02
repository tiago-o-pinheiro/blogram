import { env, type Env } from '@/server/config/env'
import { ServiceUnavailableError } from '@/server/errors/http-errors'

export class PasswordRecoveryService {
  constructor(private readonly config: Pick<Env, 'RESEND_API_KEY' | 'PASSWORD_RESET_FROM'> = env) {}

  isEnabled = (): boolean =>
    Boolean(this.config.RESEND_API_KEY?.trim() && this.config.PASSWORD_RESET_FROM?.trim())

  sendResetPassword = async ({ user, url }: { user: { email: string }; url: string }) => {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableError('Password recovery email is not configured')
    }
    if (user.email.endsWith('@owner.invalid')) {
      return
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.PASSWORD_RESET_FROM,
        to: [user.email],
        subject: 'Blogram · Recuperar contraseña / Reset password',
        text: [
          'Abre este enlace para elegir una nueva contraseña. Caduca en 15 minutos y solo se puede usar una vez.',
          'Open this link to choose a new password. It expires in 15 minutes and can only be used once.',
          url,
          'Si no lo has solicitado, ignora este correo. / If you did not request this, ignore this email.',
        ].join('\n\n'),
      }),
      signal: AbortSignal.timeout(10000),
    }).catch(() => {
      throw new ServiceUnavailableError('Password recovery email could not be sent')
    })
    if (!response.ok) {
      throw new ServiceUnavailableError('Password recovery email could not be sent')
    }
  }
}

export const passwordRecoveryService = new PasswordRecoveryService()
