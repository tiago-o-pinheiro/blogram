import { eq } from 'drizzle-orm'

import { Models } from '@/models'

import { env } from '@/server/config/env'
import { ConflictError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { secretBox, type SecretBox } from '@/server/lib/secret-box'
import { googleSignInSettings } from '@/server/modules/auth/schemas/google-settings.table'

const SINGLETON_ID = 'singleton'

export type GoogleCredentials = { clientId: string; clientSecret: string }

export class GoogleSettingsService {
  constructor(private readonly box: SecretBox = secretBox) {}

  private hasOpenableSecret = (ciphertext: string | null | undefined): boolean =>
    Boolean(ciphertext) && this.box.open(ciphertext ?? '') !== null

  private readRow = async () => {
    const [row] = await db
      .select()
      .from(googleSignInSettings)
      .where(eq(googleSignInSettings.id, SINGLETON_ID))
    return row
  }

  private readRedirectUri = (): string =>
    new URL(Models.GOOGLE_CALLBACK_PATH, env.BETTER_AUTH_URL).toString()

  getSettings = async (): Promise<Models.GoogleSignInSettings> => {
    const redirectUri = this.readRedirectUri()
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      return {
        source: 'env',
        isEnabled: true,
        clientId: env.GOOGLE_CLIENT_ID,
        hasClientSecret: true,
        redirectUri,
      }
    }
    const row = await this.readRow()
    return {
      source: 'settings',
      isEnabled: row?.isEnabled ?? false,
      clientId: row?.clientId ?? '',
      hasClientSecret: this.hasOpenableSecret(row?.clientSecretCiphertext),
      redirectUri,
    }
  }

  saveSettings = async (
    update: Models.GoogleSignInSettingsUpdate,
  ): Promise<Models.GoogleSignInSettings> => {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      throw new ConflictError('Google sign-in is managed by the environment', {
        reason: 'google-managed-by-env',
      })
    }
    const row = await this.readRow()
    const clientId = update.clientId.trim()
    const newSecret = update.clientSecret?.trim()
    const hasStoredSecret = this.hasOpenableSecret(row?.clientSecretCiphertext)

    if (hasStoredSecret && !newSecret && clientId !== (row?.clientId ?? '')) {
      throw new ValidationError('A new client secret is required when the client ID changes')
    }
    if (update.isEnabled && clientId === '') {
      throw new ValidationError('A client ID is required to enable Google sign-in')
    }
    if (update.isEnabled && !hasStoredSecret && !newSecret) {
      throw new ValidationError('A client secret is required to enable Google sign-in')
    }

    const secretColumns = newSecret ? { clientSecretCiphertext: this.box.seal(newSecret) } : {}
    const values = { isEnabled: update.isEnabled, clientId, ...secretColumns }
    await db
      .insert(googleSignInSettings)
      .values({ id: SINGLETON_ID, ...values })
      .onConflictDoUpdate({ target: googleSignInSettings.id, set: values })
    return this.getSettings()
  }

  readCredentials = async (): Promise<GoogleCredentials | null> => {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
    }
    const row = await this.readRow()
    const clientSecret = row?.clientSecretCiphertext
      ? this.box.open(row.clientSecretCiphertext)
      : null
    if (!row || !row.isEnabled || row.clientId === '' || !clientSecret) {
      return null
    }
    return { clientId: row.clientId, clientSecret }
  }
}

export const googleSettingsService = new GoogleSettingsService()
