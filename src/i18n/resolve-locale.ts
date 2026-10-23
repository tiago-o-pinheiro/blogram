import { DEFAULT_LOCALE, isLocale } from './index'
import { type Locale } from './index'

type ResolveLocaleInput = {
  cookie?: string | null
  acceptLanguage?: string | null
  siteDefault?: string | null
}

type WeightedTag = { tag: string; quality: number }

const toWeightedTag = (part: string): WeightedTag | null => {
  const [rawTag = '', ...params] = part.split(';')
  const tag = rawTag.trim().toLowerCase()
  if (!tag) {
    return null
  }
  const qualityParam = params.map((param) => param.trim()).find((param) => param.startsWith('q='))
  const quality = qualityParam ? Number(qualityParam.slice(2)) : 1
  if (Number.isNaN(quality)) {
    return null
  }
  return { tag, quality }
}

const toLocaleFromTag = (tag: string): Locale | null => {
  const [language = ''] = tag.split('-')
  return isLocale(language) ? language : null
}

const fromAcceptLanguage = (header: string): Locale | null => {
  const ranked = header
    .split(',')
    .map(toWeightedTag)
    .filter((entry): entry is WeightedTag => entry !== null && entry.quality > 0)
    .sort((left, right) => right.quality - left.quality)

  for (const { tag } of ranked) {
    const locale = toLocaleFromTag(tag)
    if (locale) {
      return locale
    }
  }
  return null
}

export const resolveLocale = ({
  cookie,
  acceptLanguage,
  siteDefault,
}: ResolveLocaleInput): Locale => {
  if (isLocale(cookie)) {
    return cookie
  }
  const fromHeader = acceptLanguage ? fromAcceptLanguage(acceptLanguage) : null
  if (fromHeader) {
    return fromHeader
  }
  return isLocale(siteDefault) ? siteDefault : DEFAULT_LOCALE
}
