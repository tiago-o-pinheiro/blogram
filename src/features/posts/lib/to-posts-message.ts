import { type TranslationKey } from '@/i18n'

export const toPostsMessageKey = (status: number): TranslationKey => {
  switch (status) {
    case 401:
      return 'posts.error.unauthorized'
    case 413:
      return 'posts.error.tooLarge'
    case 422:
      return 'posts.error.invalid'
    default:
      return 'posts.error.generic'
  }
}
