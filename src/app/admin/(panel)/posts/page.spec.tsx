import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { authService } from '@/server/modules/auth/services/auth.service'
import { postService } from '@/server/modules/posts/services/post.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

import Layout from '../layout'
import Page from './page'

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/posts',
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
}))

const SEEDED_POST: Models.Post = {
  id: 'AbCdEfGhIj',
  type: 'photo',
  status: 'draft',
  text: 'Seeded caption',
  likes: 3,
  publishedAt: null,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
  image: null,
}

afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.spyOn(authService, 'findUser').mockResolvedValue({
    id: '::owner-id::',
    name: '::name::',
    email: 'owner@example.test',
  })
})

describe('Admin posts page', () => {
  it('Given a seeded post, should render it in the list with its status and likes', async () => {
    vi.spyOn(profileService, 'getSettings').mockResolvedValue({ defaultLocale: 'en' })
    const listPosts = vi.spyOn(postService, 'listPosts').mockResolvedValue({
      data: [SEEDED_POST],
      meta: { total: 1, page: 1, pageSize: 20 },
    })

    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        {await Page({ searchParams: Promise.resolve({ status: 'draft' }) })}
      </I18nProvider>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Posts' })).toBeVisible()
    expect(screen.getByText('Draft')).toBeVisible()
    expect(screen.getByText('3 likes')).toBeVisible()
    expect(listPosts).toHaveBeenCalledWith({ page: 1, pageSize: 20, status: 'draft' })
  })

  it('Given an invalid query, should fall back to the first page', async () => {
    vi.spyOn(profileService, 'getSettings').mockResolvedValue({ defaultLocale: 'en' })
    const listPosts = vi.spyOn(postService, 'listPosts').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 20 },
    })

    await Page({ searchParams: Promise.resolve({ page: 'abc', status: 'nope' }) })

    expect(listPosts).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
  })

  it('Given no owner session, should redirect the panel layout to sign-in', async () => {
    vi.spyOn(authService, 'findUser').mockResolvedValue(null)

    await expect(Layout({ children: null })).rejects.toThrow('NEXT_REDIRECT:/sign-in')
  })

  it('BH-1: Given no owner session and the page rendered without its layout (client navigation, partial rendering), should redirect to sign-in and never load posts', async () => {
    vi.spyOn(authService, 'findUser').mockResolvedValue(null)
    vi.spyOn(profileService, 'getSettings').mockResolvedValue({ defaultLocale: 'en' })
    const listPosts = vi.spyOn(postService, 'listPosts').mockResolvedValue({
      data: [SEEDED_POST],
      meta: { total: 1, page: 1, pageSize: 20 },
    })

    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_REDIRECT:/sign-in',
    )
    expect(listPosts).not.toHaveBeenCalled()
  })

  it('BH-5: Given a status filter on page 1 of 2, should keep the filter in the next page link', async () => {
    vi.spyOn(authService, 'findUser').mockResolvedValue({
      id: 'owner-1',
      name: 'Owner',
      email: 'owner@example.test',
    })
    vi.spyOn(profileService, 'getSettings').mockResolvedValue({ defaultLocale: 'en' })
    vi.spyOn(postService, 'listPosts').mockResolvedValue({
      data: [SEEDED_POST],
      meta: { total: 40, page: 1, pageSize: 20 },
    })

    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        {await Page({ searchParams: Promise.resolve({ status: 'draft' }) })}
      </I18nProvider>,
    )

    const nextHref = screen.getByRole('link', { name: 'Next' }).getAttribute('href') ?? ''
    expect(new URLSearchParams(nextHref.split('?')[1]).get('status')).toBe('draft')
  })
})
