// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { NotFoundError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { AdjacentPostService } from '@/server/modules/feed/services/adjacent-post.service'
import { post } from '@/server/modules/posts/schemas/post.table'

const service = new AdjacentPostService()

const seedPost = (overrides: Partial<typeof post.$inferInsert> = {}) =>
  db.insert(post).values({
    publicId: 'Abcde12345',
    type: 'news',
    status: 'published',
    text: '::caption::',
    publishedAt: new Date('2026-10-20T12:00:00Z'),
    ...overrides,
  })

describe('AdjacentPostService', () => {
  it('Given three published posts, should return the neighbours of the middle one', async () => {
    await seedPost({
      publicId: 'Oldest12345',
      title: 'Oldest',
      publishedAt: new Date('2026-10-18T12:00:00Z'),
    })
    await seedPost({ publicId: 'Middle1234', publishedAt: new Date('2026-10-19T12:00:00Z') })
    await seedPost({
      publicId: 'Newest1234',
      text: 'Newest caption',
      publishedAt: new Date('2026-10-20T12:00:00Z'),
    })

    const adjacent = await service.get('Middle1234')

    expect(adjacent.newer).toMatchObject({ id: 'Newest1234', title: 'Newest caption' })
    expect(adjacent.older).toMatchObject({ id: 'Oldest12345', title: 'Oldest' })
  })

  it('Given the newest and the oldest posts, should return only one neighbour', async () => {
    await seedPost({ publicId: 'Oldest12345', publishedAt: new Date('2026-10-18T12:00:00Z') })
    await seedPost({ publicId: 'Newest1234', publishedAt: new Date('2026-10-20T12:00:00Z') })

    expect(await service.get('Newest1234')).toMatchObject({
      newer: null,
      older: { id: 'Oldest12345' },
    })
    expect(await service.get('Oldest12345')).toMatchObject({
      newer: { id: 'Newest1234' },
      older: null,
    })
  })

  it('Given a draft between two posts, should skip it', async () => {
    await seedPost({ publicId: 'Oldest12345', publishedAt: new Date('2026-10-18T12:00:00Z') })
    await seedPost({
      publicId: 'Draft12345',
      status: 'draft',
      text: '::private-caption::',
      publishedAt: new Date('2026-10-19T12:00:00Z'),
    })
    await seedPost({ publicId: 'Newest1234', publishedAt: new Date('2026-10-20T12:00:00Z') })

    const adjacent = await service.get('Newest1234')

    expect(adjacent.older).toMatchObject({ id: 'Oldest12345' })
    expect(JSON.stringify(adjacent)).not.toContain('::private-caption::')
  })

  it('Given posts published at the same instant, should order them by id and reach each exactly once', async () => {
    const publishedAt = new Date('2026-10-20T12:00:00Z')
    await seedPost({ publicId: 'TieOne1234', publishedAt })
    await seedPost({ publicId: 'TieTwo1234', publishedAt })
    await seedPost({ publicId: 'TieThree12', publishedAt })

    const ids = ['TieOne1234', 'TieTwo1234', 'TieThree12']
    const neighbours = await Promise.all(ids.map((id) => service.get(id)))
    const newest = ids.filter((_id, index) => neighbours[index]?.newer === null)
    const oldest = ids.filter((_id, index) => neighbours[index]?.older === null)
    const walked: string[] = []
    let current = newest[0]
    while (current) {
      walked.push(current)
      current = (await service.get(current)).older?.id
    }

    expect(newest).toHaveLength(1)
    expect(oldest).toHaveLength(1)
    expect([...walked].sort()).toEqual([...ids].sort())
  })

  it('Given a long caption without title, should shorten the summary title to 80 characters', async () => {
    await seedPost({
      publicId: 'Oldest12345',
      text: 'x'.repeat(200),
      publishedAt: new Date('2026-10-18T12:00:00Z'),
    })
    await seedPost({ publicId: 'Newest1234', publishedAt: new Date('2026-10-20T12:00:00Z') })

    const adjacent = await service.get('Newest1234')

    expect(adjacent.older?.title).toHaveLength(80)
  })

  it('Given a draft or unknown post, should throw NotFoundError', async () => {
    await seedPost({ publicId: 'Draft12345', status: 'draft', publishedAt: null })

    await expect(service.get('Draft12345')).rejects.toBeInstanceOf(NotFoundError)
    await expect(service.get('Missing123')).rejects.toBeInstanceOf(NotFoundError)
  })
})
