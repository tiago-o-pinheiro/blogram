import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { DeleteAllPosts } from './delete-all-posts'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const renderCard = (count = 3) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <DeleteAllPosts count={count} />
    </I18nProvider>,
  )

describe('DeleteAllPosts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    refresh.mockClear()
  })

  it('Given no posts, should disable the open button', () => {
    renderCard(0)

    expect(screen.getByRole('button', { name: 'Delete all posts' })).toBeDisabled()
  })

  it('Given the dialog, should keep submit disabled until the typed word matches', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Delete all posts' }))
    const submit = await screen.findByRole('button', { name: 'Delete everything' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByRole('textbox'), 'delete')
    expect(submit).toBeDisabled()
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'DELETE')

    expect(submit).toBeEnabled()
  })

  it('Given the word is typed, should delete, show the count and refresh', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ deleted: 3 }, { status: 200 }))
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Delete all posts' }))
    await user.type(await screen.findByRole('textbox'), 'DELETE')
    await user.click(screen.getByRole('button', { name: 'Delete everything' }))

    expect(await screen.findByText('3 posts deleted.')).toBeVisible()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/posts',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ confirm: 'delete-all-posts' }),
      }),
    )
  })

  it('Given the api fails, should show an alert and keep the dialog open', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Delete all posts' }))
    await user.type(await screen.findByRole('textbox'), 'DELETE')
    await user.click(screen.getByRole('button', { name: 'Delete everything' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not delete the posts. Try again.',
    )
    expect(refresh).not.toHaveBeenCalled()
  })
})
