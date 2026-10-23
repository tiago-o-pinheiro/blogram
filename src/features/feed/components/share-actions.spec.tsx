import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { ShareActions } from './share-actions'

const POST_URL = 'https://example.test/posts/AbCdEfGh12'

const renderActions = () =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <ShareActions id="AbCdEfGh12" title="::title::" url={POST_URL} />
    </I18nProvider>,
  )

afterEach(() => {
  Reflect.deleteProperty(navigator, 'share')
})

describe('ShareActions', () => {
  it('Given clipboard access, should copy the permanent link', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Link copied.')
    expect(writeText).toHaveBeenCalledWith(POST_URL)
  })

  it('Given clipboard rejection, should expose a selectable fallback link', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new DOMException('::blocked::', 'NotAllowedError'),
    )
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Select and copy this link.')
    const link = screen.getByRole('textbox', { name: 'Copy link' })
    expect(link).toHaveValue(POST_URL)
    expect(link).toHaveAttribute('readonly')
    await user.click(link)
    expect(link instanceof HTMLInputElement && link.selectionStart).toBe(0)
    expect(link instanceof HTMLInputElement && link.selectionEnd).toBe(POST_URL.length)
  })

  it('Given native sharing, should send the title and permanent link', async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: '::title::', url: POST_URL }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled()
  })

  it('Given native sharing is cancelled, should quietly allow another attempt', async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockRejectedValue(new DOMException('::cancelled::', 'AbortError'))
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled()
  })

  it('Given native sharing is unavailable, should copy the link', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Share' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Link copied.')
    expect(writeText).toHaveBeenCalledWith(POST_URL)
  })

  it('Given native sharing fails, should offer copy and download alternatives', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new TypeError('::failure::')),
    })
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Share' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Copy the link or download the card.',
    )
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'Download story card' })).toHaveAttribute(
      'href',
      '/api/posts/AbCdEfGh12/card',
    )
    expect(screen.getByRole('link', { name: 'Download story card' })).toHaveAttribute(
      'download',
      'blogram-AbCdEfGh12.png',
    )
  })
})
