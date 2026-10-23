import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { PostActions } from './post-actions'

const router = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const DRAFT: Models.Post = {
  id: 'AbCdEfGhIj',
  type: 'photo',
  status: 'draft',
  text: '',
  likes: 0,
  publishedAt: null,
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
  image: null,
}

const PUBLISHED: Models.Post = {
  ...DRAFT,
  status: 'published',
  publishedAt: '2026-10-23T11:00:00.000Z',
}

const renderActions = (post: Models.Post) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PostActions post={post} />
    </I18nProvider>,
  )

describe('PostActions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    router.refresh.mockClear()
  })

  it('Given a draft, should publish and refresh', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(PUBLISHED))
    renderActions(DRAFT)

    await user.click(screen.getByRole('button', { name: 'Publish' }))

    await vi.waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1))
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/posts/AbCdEfGhIj/status',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'published' }) }),
    )
  })

  it('Given a published post, should unpublish and refresh', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(DRAFT))
    renderActions(PUBLISHED)

    await user.click(screen.getByRole('button', { name: 'Unpublish' }))

    await vi.waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1))
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/posts/AbCdEfGhIj/status',
      expect.objectContaining({ body: JSON.stringify({ status: 'draft' }) }),
    )
  })

  it('Given a draft, should show a single primary action', () => {
    renderActions(DRAFT)

    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('Given the api fails, should show an alert and not refresh', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 422 }))
    renderActions(DRAFT)

    await user.click(screen.getByRole('button', { name: 'Publish' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Some of the information is not valid. Check it and try again.',
    )
    expect(router.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled()
  })

  it('Given a pending request, should disable the button', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderActions(DRAFT)

    await user.click(screen.getByRole('button', { name: 'Publish' }))

    expect(await screen.findByRole('button', { name: /Publish/ })).toBeDisabled()
  })
})
