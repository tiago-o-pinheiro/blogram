import { type TranslationKey } from '@/i18n'

import { PostsApiError } from '../api/posts-api'

export const toPostsMessageKey = (status: number): TranslationKey => {
  switch (status) {
    case 0:
    case 408:
    case 502:
    case 504:
    case 520:
    case 521:
    case 522:
    case 523:
    case 524:
      return 'posts.error.interrupted'
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

export const toPostsErrorKey = (error: unknown): TranslationKey => {
  if (!(error instanceof PostsApiError)) {
    return 'posts.error.generic'
  }
  if (error.reason === 'storageCors') {
    return 'posts.error.storageCors'
  }
  if (error.reason === 'interrupted') {
    return 'posts.error.interrupted'
  }
  return toPostsMessageKey(error.status)
}
