import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { db } from '@/server/lib/db'
import { FeedService } from '@/server/modules/feed/services/feed.service'
import { PlacePinService } from '@/server/modules/feed/services/place-pin.service'
import { post } from '@/server/modules/posts/schemas/post.table'
import { AttemptThrottleService } from '@/server/modules/setup/services/attempt-throttle.service'

const service = new FeedService()
const COORDINATES = { lat: 38.7, lon: -9.1 }
const PLACE = { name: '::place::', mapUrl: Models.toPlaceMapUrl(COORDINATES) }
const FILTER = Models.toFeedPlaceKey({ name: PLACE.name, coordinates: COORDINATES })

const seedPost = (publicId: string, overrides: Partial<typeof post.$inferInsert> = {}) =>
  db.insert(post).values({
    publicId,
    type: 'news',
    status: 'published',
    text: '::caption::',
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    place: PLACE,
    ...overrides,
  })

describe('FeedService place filter', () => {
  it('Given one place under several names and pins, should match all of it and nothing far away', async () => {
    await seedPost('Aaaaa11111')
    await seedPost('Bbbbb22222', {
      place: { name: PLACE.name, mapUrl: 'https://www.openstreetmap.org/#map=15/38.7/-9.1' },
    })
    await seedPost('Ccccc33333', {
      place: { name: PLACE.name, mapUrl: Models.toPlaceMapUrl({ lat: 40, lon: 2 }) },
    })
    await seedPost('Ddddd44444', { place: { name: PLACE.name } })
    await seedPost('Eeeee55555', { place: { name: '::other::', mapUrl: PLACE.mapUrl } })
    await seedPost('Draft12345', { status: 'draft' })

    const page = await service.list({ place: FILTER, page: 1, pageSize: 12 })
    const pins = await new PlacePinService().list()

    expect(page.data.map((item) => item.id).sort()).toEqual([
      'Aaaaa11111',
      'Bbbbb22222',
      'Ddddd44444',
      'Eeeee55555',
    ])
    expect(pins.find((pin) => pin.place === FILTER)?.count).toBe(page.meta.total)
  })

  it('Given the key of a place merged into another, should still load the whole place', async () => {
    await seedPost('Aaaaa11111')
    await seedPost('Bbbbb22222')
    await seedPost('Ccccc33333', { place: { name: PLACE.name } })

    const page = await service.list({
      place: Models.toFeedPlaceKey({ name: PLACE.name, coordinates: null }),
      page: 1,
      pageSize: 12,
    })

    expect(page.data.map((item) => item.id).sort()).toEqual([
      'Aaaaa11111',
      'Bbbbb22222',
      'Ccccc33333',
    ])
  })

  it('Given place, search and type filters, should combine them before pagination', async () => {
    await seedPost('Aaaaa11111', { type: 'photo', text: '::bay::' })
    await seedPost('Bbbbb22222', {
      type: 'photo',
      text: '::bay::',
      publishedAt: new Date('2026-02-01'),
    })
    await seedPost('Ccccc33333', { type: 'news', text: '::bay::' })
    await seedPost('Ddddd44444', { type: 'photo', text: '::other::' })
    await seedPost('Eeeee55555', { type: 'photo', text: '::bay::', place: null })

    const first = await service.list({
      place: FILTER,
      type: 'photo',
      q: 'bay',
      page: 1,
      pageSize: 1,
    })
    const second = await service.list({
      place: FILTER,
      type: 'photo',
      q: 'bay',
      page: 2,
      pageSize: 1,
    })

    expect(first.meta.total).toBe(2)
    expect(first.data.map((item) => item.id)).toEqual(['Bbbbb22222'])
    expect(second.data.map((item) => item.id)).toEqual(['Aaaaa11111'])
  })

  it('Given an unknown place, should return an empty page', async () => {
    await seedPost('Aaaaa11111')

    const page = await service.list({
      place: Models.toFeedPlaceKey({ name: '::unknown::', coordinates: null }),
      page: 1,
      pageSize: 12,
    })

    expect(page.meta.total).toBe(0)
    expect(page.data).toEqual([])
  })

  it('Given an invalid place parameter, should reject the filter', async () => {
    await expect(service.list({ place: 'invalid', page: 1, pageSize: 12 })).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})

describe('FeedService like window', () => {
  it('BH-AUDIT-2: Given an expired client vote, should allow one new like after twenty four hours', async () => {
    const start = new Date('2026-11-02T12:00:00Z')
    let current = start
    const likes = new FeedService(new AttemptThrottleService(() => current))
    await seedPost('Aaaaa11111')

    expect(await likes.like('Aaaaa11111', '::client::')).toEqual({ likes: 1 })
    current = new Date(start.getTime() + 86399 * 1000)
    expect(await likes.like('Aaaaa11111', '::client::')).toEqual({ likes: 1 })
    current = new Date(start.getTime() + 86400 * 1000)

    expect(await likes.like('Aaaaa11111', '::client::')).toEqual({ likes: 2 })
  })

  it('BH-AUDIT-2: Given an expired rate window, should accept the previously rejected vote', async () => {
    const start = new Date('2026-11-02T12:00:00Z')
    let current = start
    const likes = new FeedService(new AttemptThrottleService(() => current))
    const records = Array.from({ length: 61 }, (_, index) => ({
      publicId: String(index).padStart(10, '0'),
      type: 'news' as const,
      status: 'published' as const,
      publishedAt: start,
    }))
    await db.insert(post).values(records)
    await Promise.all(
      records.slice(0, 60).map((record) => likes.like(record.publicId, '::client::')),
    )
    await expect(likes.like('0000000060', '::client::')).rejects.toMatchObject({ statusCode: 429 })
    current = new Date(start.getTime() + 900 * 1000)

    expect(await likes.like('0000000060', '::client::')).toEqual({ likes: 1 })
  })
})

describe('FeedService pagination bounds', () => {
  it('BH-AUDIT-8: Given a page past filtered results, should return the last matching page', async () => {
    await seedPost('Aaaaa11111', { type: 'photo', text: '::bay::' })
    await seedPost('Bbbbb22222', {
      type: 'photo',
      text: '::bay::',
      publishedAt: new Date('2026-02-01'),
    })
    await seedPost('Ccccc33333', {
      type: 'photo',
      text: '::bay::',
      publishedAt: new Date('2026-03-01'),
    })
    await seedPost('Ddddd44444', { type: 'news', text: '::bay::' })
    await seedPost('Eeeee55555', { type: 'photo', text: '::bay::', place: null })
    await seedPost('Fffff66666', { type: 'photo', text: '::mountain::' })

    const page = await service.list({
      place: FILTER,
      type: 'photo',
      q: 'bay',
      page: 999999,
      pageSize: 2,
    })

    expect(page.meta).toEqual({ total: 3, page: 2, pageSize: 2 })
    expect(page.data.map((record) => record.id)).toEqual(['Aaaaa11111'])
  })

  it('BH-AUDIT-8: Given an empty feed, should preserve its empty state', async () => {
    const page = await service.list({ page: 999999, pageSize: 12 })

    expect(page.data).toEqual([])
    expect(page.meta.total).toBe(0)
  })
})
