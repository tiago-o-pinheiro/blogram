const likedPosts = new Set<string>()
const CHANGE_EVENT = 'blogram:like'

export const readLiked = (id: string): boolean => {
  if (likedPosts.has(id)) {
    return true
  }
  try {
    return globalThis.localStorage.getItem(`post:${id}:liked`) === 'true'
  } catch {
    return false
  }
}

export const rememberLike = (id: string): void => {
  likedPosts.add(id)
  try {
    globalThis.localStorage.setItem(`post:${id}:liked`, 'true')
  } catch {
    likedPosts.add(id)
  }
  globalThis.dispatchEvent(new Event(CHANGE_EVENT))
}

export const subscribeLikes = (onChange: () => void): (() => void) => {
  globalThis.addEventListener('storage', onChange)
  globalThis.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    globalThis.removeEventListener('storage', onChange)
    globalThis.removeEventListener(CHANGE_EVENT, onChange)
  }
}
