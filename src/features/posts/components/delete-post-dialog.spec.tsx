import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { DeletePostDialog } from './delete-post-dialog'

const POST: Models.Post = {
  id: 'AbCdEfGhIj',
  type: 'photo',
  status: 'draft',
  text: 'Hello',
  likes: 0,
  publishedAt: null,
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
  image: null,
}

const renderDialog = (onDeleted = vi.fn()) => {
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <DeletePostDialog post={POST} onDeleted={onDeleted} />
    </I18nProvider>,
  )
  return onDeleted
}

describe('DeletePostDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Given the dialog is closed, should not call the api', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderDialog()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Given the owner cancels, should delete nothing', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const onDeleted = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('dialog')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('Given the owner confirms, should delete the post and call onDeleted', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))
    const onDeleted = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete post' }))

    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/posts/AbCdEfGhIj',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('Given the api fails, should show an alert and keep the dialog open', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
    const onDeleted = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete post' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    )
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('Given a pending delete, should disable the confirm button', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete post' }))

    expect(await screen.findByRole('button', { name: /Delete post/ })).toBeDisabled()
  })
})
