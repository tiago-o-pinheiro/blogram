import { type TranslationKey } from '@/i18n'

export const toSignInMessageKey = (status: number): TranslationKey =>
  status === 401 ? 'signin.errors.invalid' : 'signin.errors.generic'
