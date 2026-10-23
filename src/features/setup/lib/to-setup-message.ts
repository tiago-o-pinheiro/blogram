import { type TranslationKey } from '@/i18n'

export const toSetupMessageKey = (status: number): TranslationKey => {
  switch (status) {
    case 401:
      return 'errors.setup.unauthorized'
    case 403:
      return 'errors.setup.forbidden'
    case 413:
      return 'errors.setup.tooLarge'
    case 422:
      return 'errors.setup.invalid'
    case 429:
      return 'errors.setup.tooMany'
    case 503:
      return 'errors.setup.unavailable'
    default:
      return 'errors.setup.generic'
  }
}
