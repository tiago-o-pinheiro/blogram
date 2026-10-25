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

const renderForm = (isAiEnabled: boolean, post?: Models.Post) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PostForm
        post={post}
        isAiEnabled={isAiEnabled}
        maxImageBytes={Models.DEFAULT_UPLOAD_MAX_IMAGE_BYTES}
        maxVideoBytes={1024}
      />
    </I18nProvider>,
  )

const requestedFields = (call: unknown[]) => {
  const init = call[1]
  if (!(init instanceof Object) || !('body' in init) || !(init.body instanceof FormData)) {
    return []
  }
  return init.body.getAll('field')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PostForm AI assistance', () => {
  it('Given AI is disabled, should render no AI controls', () => {
    renderForm(false, POST)

    expect(screen.queryByRole('region', { name: 'AI assistant' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Write the title with AI' }),
    ).not.toBeInTheDocument()
  })

  it('Given AI is enabled, should show the prompt card and the field buttons', () => {
    renderForm(true, POST)

    expect(screen.getByRole('region', { name: 'AI assistant' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Write the title with AI' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Write the alt text with AI' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Write the caption with AI' })).toBeEnabled()
  })

  it('Given a field button, should request and fill only that field', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ title: 'Golden hour' }))
    renderForm(true, POST)

    await userEvent.click(screen.getByRole('button', { name: 'Write the title with AI' }))

    expect(await screen.findByDisplayValue('Golden hour')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sunrise')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A sunrise')).toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(requestedFields(fetchSpy.mock.calls[0] ?? [])).toEqual(['title'])
  })

  it('Given Generate all, should send every offered field, fill them and undo restores them', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ title: 'New', altText: 'New alt', text: 'New caption' }))
    renderForm(true, POST)

    await userEvent.click(screen.getByRole('button', { name: 'Generate all' }))

    expect(await screen.findByDisplayValue('New caption')).toBeInTheDocument()
    expect(screen.getByDisplayValue('New')).toBeInTheDocument()
    expect(screen.getByDisplayValue('New alt')).toBeInTheDocument()
    expect(requestedFields(fetchSpy.mock.calls[0] ?? [])).toEqual(['title', 'altText', 'text'])

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByDisplayValue('Old title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A sunrise')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sunrise')).toBeInTheDocument()
  })

  it('Given a request in flight, should disable every AI button', async () => {
    const pending = new Promise<Response>(() => {})
    vi.spyOn(globalThis, 'fetch').mockReturnValue(pending)
    renderForm(true, POST)

    await userEvent.click(screen.getByRole('button', { name: 'Write the caption with AI' }))

    expect(screen.getByRole('button', { name: 'Generate all' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Write the title with AI' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Write the alt text with AI' })).toBeDisabled()
  })

  it('Given no prompt, image or text, should disable the AI buttons with the hint', () => {
    renderForm(true)

    expect(screen.getByRole('button', { name: 'Generate all' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Write the title with AI' })).toBeDisabled()
    expect(screen.getByText('Write a prompt or add a photo first')).toBeInTheDocument()
  })

  it('Given a link post with only a link title, should enable the caption button and send the link title', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ text: 'Worth a read' }))
    renderForm(true, {
      ...POST,
      type: 'link',
      title: undefined,
      text: '',
      image: null,
      link: {
        url: 'https://example.com/article',
        title: ' Example article ',
        description: '',
        source: 'Example',
      },
    })

    const button = screen.getByRole('button', { name: 'Write the caption with AI' })
    expect(button).toBeEnabled()
    await userEvent.click(button)

    await screen.findByDisplayValue('Worth a read')
    const init = fetchSpy.mock.calls[0]?.[1]
    const body = init instanceof Object && 'body' in init ? init.body : null
    expect(body instanceof FormData ? body.get('title') : null).toBe('Example article')
  })

  it('Given a provider failure, should show the mapped error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ details: { reason: 'auth' } }, { status: 502 }),
    )
    renderForm(true, POST)

    await userEvent.click(screen.getByRole('button', { name: 'Generate all' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The provider rejected the API key. Check it in Account settings.',
    )
  })
})
