// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { db } from '@/server/lib/db'
import { PlacePinService } from '@/server/modules/feed/services/place-pin.service'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'

const service = new PlacePinService()
const LISBON = { lat: 38.72225, lon: -9.13934 }

const seedPost = (publicId: string, publishedAt: string, overrides = {}) =>
  db.insert(post).values({
    publicId,
    type: 'news',
    status: 'published',
    text: '::caption::',
    publishedAt: new Date(publishedAt),
    ...overrides,
  })

describe('PlacePinService', () => {
  it('Given posts without places or drafts, should list nothing', async () => {
    await seedPost('Aaaaa11111', '2026-01-01T00:00:00Z')
    await seedPost('Draft12345', '2026-01-02T00:00:00Z', {
      status: 'draft',
      place: { name: 'Lisbon' },
    })

    expect(await service.list()).toEqual([])
  })

  it('Given several posts at one place, should group them newest first with coordinates', async () => {
    const place = { name: 'Lisbon', mapUrl: Models.toPlaceMapUrl(LISBON) }
    await seedPost('Aaaaa11111', '2026-01-01T00:00:00Z', { place })
    await seedPost('Bbbbb22222', '2026-02-01T00:00:00Z', { place })

    const pins = await service.list()

    expect(pins).toHaveLength(1)
    expect(pins[0]).toMatchObject({ name: 'Lisbon', coordinates: LISBON })
    expect(pins[0]?.posts.map((item) => item.id)).toEqual(['Bbbbb22222', 'Aaaaa11111'])
  })

  it('Given a place without coordinates, should keep it as its own list-only pin', async () => {
    await seedPost('Aaaaa11111', '2026-01-01T00:00:00Z', { place: { name: 'Lisbon' } })
    await seedPost('Bbbbb22222', '2026-02-01T00:00:00Z', {
      place: { name: 'Lisbon', mapUrl: Models.toPlaceMapUrl(LISBON) },
    })

    const pins = await service.list()

    expect(pins.map((pin) => pin.coordinates)).toEqual([LISBON, null])
  })

  it('Given a photo post at a place, should expose only id, width and height of its image', async () => {
    const [seeded] = await seedPost('Aaaaa11111', '2026-01-01T00:00:00Z', {
      type: 'photo',
      place: { name: 'Lisbon' },
    }).returning({ id: post.id })
    if (!seeded) {
      throw new Error('post not seeded')
    }
    await db.insert(media).values({
      postId: seeded.id,
      key: '::key::',
      contentType: 'image/jpeg',
      width: 400,
      height: 300,
      sizeBytes: 10,
      altText: '::alt::',
      metadata: { camera: { make: 'Canon' }, placeholder: 'data:image/jpeg;base64,AAAA' },
    })

    const [pin] = await service.list()

    expect(Object.keys(pin?.posts[0]?.image ?? {}).sort()).toEqual(['height', 'id', 'width'])
  })
})
