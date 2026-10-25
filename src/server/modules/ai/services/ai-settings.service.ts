import { eq } from 'drizzle-orm'

import { Models } from '@/models'

import { ConflictError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { aiSettings } from '@/server/modules/ai/schemas/ai.table'
import { secretBox, type SecretBox } from '@/server/modules/ai/services/secret-box'

const SINGLETON_ID = 'singleton'
const DEFAULT_PROVIDER: Models.AiProvider = 'openai'
const API_KEY_HINT_LENGTH = 4

type AiCredentials = { provider: Models.AiProvider; model: string; apiKey: string }

export class AiSettingsService {
  constructor(private readonly box: SecretBox = secretBox) {}

  private hasOpenableKey = (ciphertext: string | null | undefined): boolean =>
    Boolean(ciphertext) && this.box.open(ciphertext ?? '') !== null

  getSettings = async (): Promise<Models.AiSettings> => {
    const [row] = await db.select().from(aiSettings).where(eq(aiSettings.id, SINGLETON_ID))
    if (!row) {
      return {
        isEnabled: false,
        provider: DEFAULT_PROVIDER,
        model: Models.AI_MODEL_SUGGESTIONS[DEFAULT_PROVIDER][0] ?? '',
        hasApiKey: false,
        apiKeyHint: '',
      }
    }
    const hasApiKey = this.hasOpenableKey(row.apiKeyCiphertext)
    return {
      isEnabled: row.isEnabled,
      provider: row.provider,
      model: row.model,
      hasApiKey,
      apiKeyHint: hasApiKey ? row.apiKeyHint : '',
    }
  }

  saveSettings = async (update: Models.AiSettingsUpdate): Promise<Models.AiSettings> => {
    const [row] = await db.select().from(aiSettings).where(eq(aiSettings.id, SINGLETON_ID))
    const storedProvider = row?.provider ?? DEFAULT_PROVIDER
    const hasStoredKey = this.hasOpenableKey(row?.apiKeyCiphertext)
    const newKey = update.apiKey?.trim()

    if (hasStoredKey && !newKey && update.provider !== storedProvider) {
      throw new ValidationError('A new API key is required when the provider changes')
    }
    if (update.isEnabled && update.model.trim() === '') {
      throw new ValidationError('A model is required to enable the AI assistant')
    }
    if (update.isEnabled && !hasStoredKey && !newKey) {
      throw new ValidationError('An API key is required to enable the AI assistant')
    }

    const keyColumns = newKey
      ? {
          apiKeyCiphertext: this.box.seal(newKey),
          apiKeyHint: newKey.length > API_KEY_HINT_LENGTH ? newKey.slice(-API_KEY_HINT_LENGTH) : '',
        }
      : {}
    const values = {
      isEnabled: update.isEnabled,
      provider: update.provider,
      model: update.model,
      ...keyColumns,
    }
    await db
      .insert(aiSettings)
      .values({ id: SINGLETON_ID, ...values })
      .onConflictDoUpdate({ target: aiSettings.id, set: values })
    return this.getSettings()
  }

  readCredentials = async (): Promise<AiCredentials> => {
    const [row] = await db.select().from(aiSettings).where(eq(aiSettings.id, SINGLETON_ID))
    const apiKey = row?.apiKeyCiphertext ? this.box.open(row.apiKeyCiphertext) : null
    if (!row || !row.isEnabled || row.model === '' || !apiKey) {
      throw new ConflictError('AI is not configured', { reason: 'ai-not-configured' })
    }
    return { provider: row.provider, model: row.model, apiKey }
  }
}

export const aiSettingsService = new AiSettingsService()
