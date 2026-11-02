// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { db } from '@/server/lib/db'
import { PlacePinService } from '@/server/modules/feed/services/place-pin.service'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'

const service = new PlacePinService()
const LISBON = { lat: 38.72225, lon: -9.13934 }

const seedPost = (
  publicId: string,
  publishedAt: string,
  overrides: Partial<typeof post.$inferInsert> = {},
) =>
  db.insert(post).values({
    publicId,
    type: 'news',
    status: 'published',
    text: '::caption::',
    publishedAt: new Date(publishedAt),
    ...overrides,
  })

const seedPhoto = async (publicId: string, publishedAt: string, place: Models.PostPlace) => {
  const [photo] = await seedPost(publicId, publishedAt, { type: 'photo', place }).returning({
    id: post.id,
  })
  if (!photo) {
    throw new Error('post not seeded')
  }
  await db.insert(media).values({
    postId: photo.id,
    key: '::key::',
    contentType: 'image/jpeg',
    width: 400,
    height: 300,
    sizeBytes: 10,
    altText: '::alt::',
    metadata: { camera: { make: 'Canon' }, placeholder: 'data:image/jpeg;base64,AAAA' },
  })
}

describe('PlacePinService', () => {
  it('Given posts without places or drafts, should list nothing', async () => {
    await seedPost('Aaaaa11111', '2026-01-01T00:00:00Z')
    await seedPost('Draft12345', '2026-01-02T00:00:00Z', {
      status: 'draft',
      place: { name: 'Lisbon' },
    })

    expect(await service.list()).toEqual([])
  })

  it('Given several posts at one place, should group counts with coordinates', async () => {
    const place = { name: 'Lisbon', mapUrl: Models.toPlaceMapUrl(LISBON) }
    await seedPost('Aaaaa11111', '2026-01-01T00:00:00Z', { place })
    await seedPost('Bbbbb22222', '2026-02-01T00:00:00Z', { place })

    const pins = await service.list()

    expect(pins).toHaveLength(1)
    expect(pins[0]).toMatchObject({ name: 'Lisbon', coordinates: LISBON })
    expect(pins[0]?.count).toBe(2)
    expect(pins[0]?.place).toBe(Models.toFeedPlaceKey({ name: 'Lisbon', coordinates: LISBON }))
  })

  it('Given a place without coordinates, should keep it as its own list-only pin', async () => {
    await seedPost('Aaaaa11111', '2026-01-01T00:00:00Z', { place: { name: 'Lisbon' } })
    await seedPost('Bbbbb22222', '2026-02-01T00:00:00Z', {
      place: { name: 'Lisbon', mapUrl: Models.toPlaceMapUrl(LISBON) },
    })

    const pins = await service.list()

    expect(pins.map((pin) => pin.coordinates)).toEqual([LISBON, null])
  })

  it('Given a photo post at a place, should expose its image and available variants', async () => {
    await seedPhoto('Aaaaa11111', '2026-01-01T00:00:00Z', { name: 'Lisbon' })

    const [pin] = await service.list()

    expect(Object.keys(pin?.cover?.image ?? {}).sort()).toEqual([
      'height',
      'id',
      'variants',
      'width',
    ])
  })
  it('Given equivalent map URLs, should merge only matching names and coordinates', async () => {
    await seedPost('Aaaaa11111', '2026-01-01T00:00:00Z', {
      place: { name: '::place::', mapUrl: Models.toPlaceMapUrl(LISBON) },
    })
    await seedPost('Bbbbb22222', '2026-02-01T00:00:00Z', {
      place: {
        name: '::place::',
        mapUrl: 'https://www.openstreetmap.org/#map=15/38.72225/-9.13934',
      },
    })
    await seedPost('Ccccc33333', '2026-03-01T00:00:00Z', {
      place: { name: '::place::', mapUrl: Models.toPlaceMapUrl({ lat: 40, lon: 2 }) },
    })

    const pins = await service.list()

    expect(pins).toHaveLength(2)
    expect(pins.map((pin) => pin.count)).toEqual([1, 2])
    expect(pins[0]?.place).not.toBe(pins[1]?.place)
  })

  it('Given over five hundred geotagged posts, should include every place and count', async () => {
    await db.insert(post).values(
      Array.from({ length: 501 }, (_, index) => ({
        publicId: String(index).padStart(10, '0'),
        type: 'news' as const,
        status: 'published' as const,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        place: { name: index === 0 ? '::oldest::' : '::place::' },
      })),
    )

    const pins = await service.list()

    expect(pins).toHaveLength(2)
    expect(pins.reduce((sum, pin) => sum + pin.count, 0)).toBe(501)
    expect(pins.find((pin) => pin.name === '::oldest::')?.count).toBe(1)
  })

  it('Given a newer text post, should retain the latest available image cover', async () => {
    await seedPhoto('Aaaaa11111', '2026-01-01T00:00:00Z', { name: '::place::' })
    await seedPost('Bbbbb22222', '2026-02-01T00:00:00Z', { place: { name: '::place::' } })

    const [pin] = await service.list()

    expect(pin?.count).toBe(2)
    expect(pin?.cover?.id).toBe('Aaaaa11111')
  })
})

describe('PlacePinService cover identity', () => {
  it('Given equivalent URLs with image posts, should choose the newest image across groups', async () => {
    const place = { name: '::place::', mapUrl: Models.toPlaceMapUrl(LISBON) }
    await seedPhoto('Aaaaa11111', '2026-01-01T00:00:00Z', place)
    await seedPhoto('Bbbbb22222', '2026-02-01T00:00:00Z', {
      name: place.name,
      mapUrl: 'https://www.openstreetmap.org/#map=15/38.72225/-9.13934',
    })
    await seedPost('Ccccc33333', '2026-03-01T00:00:00Z', { place })

    const [pin] = await service.list()

    expect(pin?.count).toBe(3)
    expect(pin?.cover?.id).toBe('Bbbbb22222')
  })
})
