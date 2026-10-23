type CookieOptions = {
  maxAgeSeconds: number
  isSecure: boolean
}

export const readCookie = (headers: Headers, name: string): string | null => {
  const header = headers.get('cookie')
  if (!header) {
    return null
  }
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) {
      continue
    }
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim()
    }
  }
  return null
}

const serialize = (name: string, value: string, maxAgeSeconds: number, isSecure: boolean) =>
  [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    ...(isSecure ? ['Secure'] : []),
  ].join('; ')

export const serializeCookie = (name: string, value: string, options: CookieOptions) =>
  serialize(name, value, options.maxAgeSeconds, options.isSecure)

export const serializeClearedCookie = (name: string, isSecure: boolean) =>
  serialize(name, '', 0, isSecure)
