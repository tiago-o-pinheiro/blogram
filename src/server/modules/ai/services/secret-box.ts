import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

import { env } from '@/server/config/env'

const VERSION = 'v1'
const IV_BYTES = 12
const TAG_BYTES = 16
const KEY_BYTES = 32
const KEY_INFO = 'blogram-ai-secret-box'

export type SecretBox = {
  seal: (plain: string) => string
  open: (box: string) => string | null
}

export const createSecretBox = (secret: string): SecretBox => {
  const key = Buffer.from(hkdfSync('sha256', secret, '', KEY_INFO, KEY_BYTES))

  const seal = (plain: string): string => {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return [VERSION, iv, cipher.getAuthTag(), data]
      .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
      .join('.')
  }

  const open = (box: string): string | null => {
    const [version, ivPart, tagPart, dataPart, ...rest] = box.split('.')
    if (version !== VERSION || !ivPart || !tagPart || dataPart === undefined || rest.length > 0) {
      return null
    }
    const iv = Buffer.from(ivPart, 'base64url')
    const tag = Buffer.from(tagPart, 'base64url')
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      return null
    }
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([
        decipher.update(Buffer.from(dataPart, 'base64url')),
        decipher.final(),
      ]).toString('utf8')
    } catch {
      return null
    }
  }

  return { seal, open }
}

export const secretBox = createSecretBox(env.BETTER_AUTH_SECRET)
