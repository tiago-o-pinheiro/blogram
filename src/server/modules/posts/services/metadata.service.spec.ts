import { describe, expect, it, vi } from 'vitest'

import { isPublicAddress, MetadataService } from './metadata.service'

describe('MetadataService', () => {
  it('Given a public destination, should pin the validated address and extract editable fields', async () => {
    const request = vi.fn(async () => ({
      status: 200,
      contentType: 'text/html',
      body: '<head><title>Fallback</title><meta content="A &amp; B" property="og:title"><meta name="description" content="Small excerpt"><meta property="og:site_name" content="Original source"></head><article>Never copied</article>',
    }))
    const service = new MetadataService({
      resolve: async () => [{ address: '93.184.215.14', family: 4 }],
      request,
    })

    const metadata = await service.fetchMetadata('https://example.com/article')

    expect(metadata).toEqual({
      url: 'https://example.com/article',
      title: 'A & B',
      description: 'Small excerpt',
      source: 'Original source',
    })
    expect(request).toHaveBeenCalledWith(
      new URL('https://example.com/article'),
      { address: '93.184.215.14', family: 4 },
      expect.any(AbortSignal),
    )
  })

  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '100.64.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '2001:db8::1',
    '2002:7f00:1::',
  ])('Given the private address %s, should avoid requesting metadata', async (address) => {
    const request = vi.fn()
    const service = new MetadataService({
      resolve: async () => [{ address, family: address.includes(':') ? 6 : 4 }],
      request,
    })

    const metadata = await service.fetchMetadata('http://internal.test/article')

    expect(request).not.toHaveBeenCalled()
    expect(metadata.title).toBe('')
  })

  it('Given a redirect to an internal address, should stop before contacting it', async () => {
    const request = vi.fn(async () => ({
      status: 302,
      contentType: 'text/html',
      location: 'http://private.test/secret',
      body: '',
    }))
    const service = new MetadataService({
      resolve: async (hostname) => [
        { address: hostname === 'example.com' ? '93.184.215.14' : '127.0.0.1', family: 4 },
      ],
      request,
    })

    const metadata = await service.fetchMetadata('https://example.com/article')

    expect(request).toHaveBeenCalledTimes(1)
    expect(metadata.title).toBe('')
  })

  it('Given a redirect cycle, should cap network requests and preserve manual publishing', async () => {
    const request = vi.fn(async () => ({
      status: 302,
      contentType: 'text/html',
      location: '/again',
      body: '',
    }))
    const service = new MetadataService({
      resolve: async () => [{ address: '93.184.215.14', family: 4 }],
      request,
    })

    const metadata = await service.fetchMetadata('https://example.com/article')

    expect(request).toHaveBeenCalledTimes(4)
    expect(metadata).toEqual({
      url: 'https://example.com/article',
      title: '',
      description: '',
      source: 'example.com',
    })
  })

  it('Given mixed public and private DNS answers, should refuse the destination', async () => {
    const request = vi.fn()
    const service = new MetadataService({
      resolve: async () => [
        { address: '93.184.215.14', family: 4 },
        { address: '10.0.0.1', family: 4 },
      ],
      request,
    })

    await service.fetchMetadata('https://example.com/article')

    expect(request).not.toHaveBeenCalled()
  })

  it('Given failed metadata discovery, should retain manually editable fallback fields', async () => {
    const service = new MetadataService({
      resolve: async () => {
        throw new TypeError('DNS unavailable')
      },
      request: vi.fn(),
    })

    expect(await service.fetchMetadata('https://example.com/article')).toEqual({
      url: 'https://example.com/article',
      title: '',
      description: '',
      source: 'example.com',
    })
  })

  it.each(['93.184.215.14', '2606:4700:4700::1111'])(
    'Given the public address %s, should permit metadata requests',
    (address) => {
      expect(isPublicAddress(address)).toBe(true)
    },
  )
})
