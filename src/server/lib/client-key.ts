const UNKNOWN_CLIENT_KEY = 'unknown'

export const toClientKey = (headers: Headers): string =>
  headers.get('cf-connecting-ip')?.trim() ||
  headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ||
  UNKNOWN_CLIENT_KEY
