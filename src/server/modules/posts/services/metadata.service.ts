import { lookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'

import { type Models } from '@/models'

import { ValidationError } from '@/server/errors/http-errors'

import { normalizeWebUrl } from './post-url'

const METADATA_TIMEOUT_MS = 5000
const METADATA_MAX_BYTES = 524288
const METADATA_MAX_REDIRECTS = 3
const REDIRECT_STATUSES = [301, 302, 303, 307, 308]

type ResolvedAddress = { address: string; family: number }
type MetadataResponse = { status: number; location?: string; contentType: string; body: string }
type MetadataDependencies = {
  resolve: (hostname: string) => Promise<ResolvedAddress[]>
  request: (url: URL, address: ResolvedAddress, signal: AbortSignal) => Promise<MetadataResponse>
}

export const isPublicAddress = (address: string): boolean => {
  if (isIP(address) === 4) {
    const [first = 0, second = 0, third = 0] = address.split('.').map(Number)
    return !(
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && (second === 168 || (second === 0 && (third === 0 || third === 2)))) ||
      (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) ||
      (first === 203 && second === 0 && third === 113)
    )
  }
  if (isIP(address) === 6) {
    const [first = 0, second = 0] = address
      .toLowerCase()
      .split(':')
      .map((part) => Number.parseInt(part || '0', 16))
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      first !== 0x2002 &&
      !(first === 0x2001 && (second <= 0x1ff || second === 0xdb8)) &&
      !(first === 0x3fff && second <= 0x0fff)
    )
  }
  return false
}

const requestPage: MetadataDependencies['request'] = (url, address, signal) =>
  new Promise((resolve, reject) => {
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest
    const request = send(
      url,
      {
        signal,
        agent: false,
        family: address.family,
        lookup: (_hostname, options, callback) =>
          callback(null, options.all ? [address] : address.address, address.family),
        headers: {
          accept: 'text/html',
          'accept-encoding': 'identity',
          'user-agent': 'Blogram/1.0 metadata',
        },
      },
      (response) => {
        const status = response.statusCode ?? 502
        const contentType = response.headers['content-type'] ?? ''
        if (REDIRECT_STATUSES.includes(status)) {
          response.destroy()
          resolve({ status, location: response.headers.location, contentType, body: '' })
          return
        }
        if (
          !contentType.toLowerCase().includes('text/html') ||
          Number(response.headers['content-length'] ?? 0) > METADATA_MAX_BYTES
        ) {
          response.destroy()
          reject(new ValidationError('Preview response is not a bounded HTML document'))
          return
        }
        const chunks: Buffer[] = []
        let bytes = 0
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.byteLength
          if (bytes > METADATA_MAX_BYTES) {
            response.destroy(new ValidationError('Preview response is too large'))
            return
          }
          chunks.push(chunk)
        })
        response.on('error', reject)
        response.on('end', () =>
          resolve({ status, contentType, body: Buffer.concat(chunks).toString('utf8') }),
        )
      },
    )
    request.on('error', reject)
    request.end()
  })

const decodeEntities = (text: string): string =>
  text
    .replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, (entity) => {
      const named: Record<string, string> = {
        '&amp;': '&',
        '&quot;': '"',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>',
      }
      const key = entity.toLowerCase()
      if (named[key]) {
        return named[key]
      }
      const value = key.startsWith('&#x')
        ? Number.parseInt(key.slice(3, -1), 16)
        : Number.parseInt(key.slice(2, -1), 10)
      return value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
        ? String.fromCodePoint(value)
        : ''
    })
    .replace(/\s+/g, ' ')
    .trim()

const readMetadata = (html: string, url: URL): Models.LinkMetadata => {
  const values = new Map<string, string>()
  const head = html.split(/<\/head\s*>/i)[0] ?? html
  for (const match of head.matchAll(/<meta\s[^>]*>/gi)) {
    const attributes = new Map<string, string>()
    for (const attribute of match[0].matchAll(
      /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
    )) {
      attributes.set(
        (attribute[1] ?? '').toLowerCase(),
        attribute[2] ?? attribute[3] ?? attribute[4] ?? '',
      )
    }
    const name = attributes.get('property') ?? attributes.get('name')
    const content = attributes.get('content')
    if (name && content) {
      values.set(name.toLowerCase(), decodeEntities(content))
    }
  }
  const title =
    values.get('og:title') ??
    decodeEntities(/<title[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head)?.[1] ?? '')
  return {
    url: url.href,
    title: title.slice(0, 300),
    description: (values.get('og:description') ?? values.get('description') ?? '').slice(0, 1000),
    source: (values.get('og:site_name') ?? url.hostname).slice(0, 300),
  }
}

export class MetadataService {
  constructor(
    private readonly dependencies: MetadataDependencies = {
      resolve: (hostname) => lookup(hostname, { all: true, verbatim: true }),
      request: requestPage,
    },
  ) {}

  private resolveAddresses = async (hostname: string, signal: AbortSignal) => {
    let abortResolution: () => void = () => undefined
    const aborted = new Promise<never>((_resolve, reject) => {
      abortResolution = () => reject(new ValidationError('Preview lookup timed out'))
      signal.addEventListener('abort', abortResolution, { once: true })
    })
    try {
      signal.throwIfAborted()
      return await Promise.race([this.dependencies.resolve(hostname), aborted])
    } finally {
      signal.removeEventListener('abort', abortResolution)
    }
  }

  fetchMetadata = async (input: string): Promise<Models.LinkMetadata> => {
    const original = normalizeWebUrl(input)
    const fallback = { url: original.href, title: '', description: '', source: original.hostname }
    const signal = AbortSignal.timeout(METADATA_TIMEOUT_MS)
    try {
      let url = original
      for (let redirects = 0; redirects <= METADATA_MAX_REDIRECTS; redirects += 1) {
        if (url.port && url.port !== '80' && url.port !== '443') {
          throw new ValidationError('Preview URL must use a standard HTTP port')
        }
        const hostname = url.hostname.replace(/^\[|\]$/g, '')
        const addresses = await this.resolveAddresses(hostname, signal)
        signal.throwIfAborted()
        const address = addresses[0]
        if (!address || addresses.some((candidate) => !isPublicAddress(candidate.address))) {
          throw new ValidationError('Preview URL must resolve to public addresses')
        }
        const page = await this.dependencies.request(url, address, signal)
        if (REDIRECT_STATUSES.includes(page.status)) {
          if (!page.location || redirects === METADATA_MAX_REDIRECTS) {
            throw new ValidationError('Preview redirect limit reached')
          }
          url = normalizeWebUrl(new URL(page.location, url).href)
          continue
        }
        if (page.status < 200 || page.status >= 300) {
          return fallback
        }
        return readMetadata(page.body, url)
      }
      return fallback
    } catch {
      return fallback
    }
  }
}

export const metadataService = new MetadataService()
