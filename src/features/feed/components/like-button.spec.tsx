import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { LikeButton } from './like-button'

const renderLike = (id: string) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <LikeButton id={id} likes={3} />
    </I18nProvider>,
  )

beforeEach(() => localStorage.clear())

describe('Anonymous like button', () => {
  it('BH-8: Given refreshed server likes, should show the latest counter', () => {
    const view = renderLike('Refresh123')

    view.rerender(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <LikeButton id="Refresh123" likes={8} />
      </I18nProvider>,
    )

    expect(screen.getByText('8')).toBeVisible()
  })

  it('BH-8: Given older server props, should retain confirmed likes', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ likes: 7 }))
    const view = renderLike('Confirmed1')

    await user.click(screen.getByRole('button', { name: 'Like' }))
    expect(await screen.findByText('7')).toBeVisible()
    view.rerender(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <LikeButton id="Confirmed1" likes={4} />
      </I18nProvider>,
    )

    expect(screen.getByText('7')).toBeVisible()
    view.rerender(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <LikeButton id="Confirmed1" likes={9} />
      </I18nProvider>,
    )
    expect(screen.getByText('9')).toBeVisible()
    view.rerender(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <LikeButton id="Confirmed1" likes={4} />
      </I18nProvider>,
    )
    expect(screen.getByText('9')).toBeVisible()
  })

  it('Given a confirmed like, should remember it after a reload', async () => {
    const user = userEvent.setup()
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ likes: 4 }))
    const view = renderLike('LikeSaved1')

    await user.click(screen.getByRole('button', { name: 'Like' }))

    expect(await screen.findByRole('button', { name: 'Liked' })).toBeDisabled()
    expect(localStorage.getItem('post:LikeSaved1:liked')).toBe('true')
    expect(screen.getByText('4')).toBeVisible()
    view.unmount()
    renderLike('LikeSaved1')
    expect(screen.getByRole('button', { name: 'Liked' })).toBeDisabled()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('Given a failed request, should preserve the counter and allow retry', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(Response.json({ likes: 4 }))
    renderLike('LikeRetry1')

    await user.click(screen.getByRole('button', { name: 'Like' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved')
    expect(screen.getByText('3')).toBeVisible()
    expect(localStorage.getItem('post:LikeRetry1:liked')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Like' }))
    expect(await screen.findByRole('button', { name: 'Liked' })).toBeDisabled()
  })

  it('Given blocked browser storage, should keep confirmed likes in memory', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ likes: 4 }))
    renderLike('NoStorage1')

    await user.click(screen.getByRole('button', { name: 'Like' }))

    expect(await screen.findByRole('button', { name: 'Liked' })).toBeDisabled()
  })

  it('Given a pending request and repeat clicks, should submit only once', async () => {
    const user = userEvent.setup()
    let finish: (response: Response) => void = () => undefined
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
    )
    renderLike('LikeBusy12')

    await user.dblClick(screen.getByRole('button', { name: 'Like' }))

    expect(screen.getByRole('button', { name: 'Like' })).toBeDisabled()
    expect(fetcher).toHaveBeenCalledTimes(1)
    finish(Response.json({ likes: 4 }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Liked' })).toBeDisabled())
  })
})
