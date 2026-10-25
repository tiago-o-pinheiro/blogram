// @vitest-environment node
import { describe, expect, it } from 'vitest'

import sitemap from '@/app/sitemap'
import { db } from '@/server/lib/db'
import { authService } from '@/server/modules/auth/services/auth.service'
import { SitemapService } from '@/server/modules/feed/services/sitemap.service'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { post } from '@/server/modules/posts/schemas/post.table'

const service = new SitemapService()

const completeInstallation = () =>
  db.transaction(async (tx) => {
    const { id } = await authService.createOwner(tx, {
      identifier: 'owner@example.test',
      password: '::owner-password::-12345',
    })
    await installationService.completeInstallation(tx, id)
  })

describe('SitemapService', () => {
  it('Given a pending install, should list nothing', async () => {
    await db.insert(post).values({
      publicId: 'Abcde12345',
      type: 'news',
      status: 'published',
      publishedAt: new Date(),
    })

    expect(await service.list()).toEqual([])
  })

  it('Given published posts and drafts, should list only published ones with updatedAt', async () => {
    await completeInstallation()
    await db.insert(post).values([
      { publicId: 'Abcde12345', type: 'news', status: 'published', publishedAt: new Date() },
      { publicId: 'Draft12345', type: 'news', status: 'draft' },
    ])

    const entries = await service.list()

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ id: 'Abcde12345' })
    expect(Number.isNaN(Date.parse(entries[0]?.updatedAt ?? ''))).toBe(false)
  })

  it('Given published posts, should build absolute urls for pages and posts, never drafts or admin', async () => {
    await completeInstallation()
    await db.insert(post).values([
      { publicId: 'Abcde12345', type: 'news', status: 'published', publishedAt: new Date() },
      { publicId: 'Draft12345', type: 'news', status: 'draft' },
    ])

    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toEqual([
      'http://localhost:3000',
      'http://localhost:3000/archive',
      'http://localhost:3000/places',
      'http://localhost:3000/posts/Abcde12345',
    ])
  })
})
