import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { PostForm } from './post-form'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

const POST: Models.Post = {
  id: 'AbCdEfGh12',
  type: 'photo',
  status: 'draft',
  text: 'Sunrise',
  likes: 0,
  publishedAt: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  title: 'Old title',
  image: {
    id: '3f6f5d5e-5b5a-4c1e-9d0e-1a2b3c4d5e6f',
    width: 1600,
    height: 900,
    altText: 'A sunrise',
    variants: [{ name: 'w960', width: 960, height: 540 }],
  },
}

const renderForm = () =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PostForm
        post={POST}
        isAiEnabled
        maxImageBytes={Models.DEFAULT_UPLOAD_MAX_IMAGE_BYTES}
        maxVideoBytes={1024}
      />
    </I18nProvider>,
  )

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PostForm AI undo message', () => {
  it('BH-4: Given a failed run after a successful one, should replace the error with the undo status on Undo', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ text: 'Fresh caption' }))
      .mockResolvedValueOnce(Response.json({ details: { reason: 'auth' } }, { status: 502 }))
    renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Write the caption with AI' }))
    await screen.findByDisplayValue('Fresh caption')
    await userEvent.click(screen.getByRole('button', { name: 'Write the caption with AI' }))
    await screen.findByRole('alert')

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByDisplayValue('Sunrise')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Your previous text is back.')
  })
})
