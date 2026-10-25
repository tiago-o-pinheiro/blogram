import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type AiSettings } from '@/models/models'

import { AiSettingsForm } from './ai-settings-form'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const SETTINGS: AiSettings = {
  isEnabled: true,
  provider: 'openai',
  model: 'gpt-5.4-nano',
  hasApiKey: true,
  apiKeyHint: 'abcd',
}

const renderForm = (settings: AiSettings = SETTINGS) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <AiSettingsForm settings={settings} />
    </I18nProvider>,
  )

beforeEach(() => {
  refresh.mockReset()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AiSettingsForm', () => {
  it('Given a saved key, should show its hint and omit apiKey when saving', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(SETTINGS))
    renderForm()

    expect(screen.getByText(/Saved key ending in abcd/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Your AI settings were saved.')
    const body = fetchSpy.mock.calls[0]?.[1]?.body
    expect(JSON.parse(String(body))).toEqual({
      isEnabled: true,
      provider: 'openai',
      model: 'gpt-5.4-nano',
    })
    expect(refresh).toHaveBeenCalled()
  })

  it('Given a typed key, should send it with the update', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(SETTINGS))
    renderForm()

    await user.type(screen.getByLabelText('API key'), 'sk-secret')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    await screen.findByRole('status')
    const body = fetchSpy.mock.calls[0]?.[1]?.body
    expect(JSON.parse(String(body))).toMatchObject({ apiKey: 'sk-secret' })
  })

  it('Given a provider switch, should reset the model to its first suggestion and drop the hint', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(screen.getByLabelText('Provider'), 'anthropic')

    expect(screen.getByLabelText('Model')).toHaveValue('claude-haiku-5-5')
    expect(screen.queryByText(/Saved key ending in/)).not.toBeInTheDocument()
  })

  it('Given the selected provider, should list its models as suggestions', async () => {
    const user = userEvent.setup()
    const { container } = renderForm()

    await user.selectOptions(screen.getByLabelText('Provider'), 'google')

    const values = Array.from(container.querySelectorAll('datalist option')).map((option) =>
      option.getAttribute('value'),
    )
    expect(values).toEqual(['gemini-3.5-flash-lite', 'gemini-3.6-flash'])
    expect(screen.getByLabelText('Model')).toHaveAttribute('list')
  })

  it('Given the switch off, should hide the provider block', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('switch', { name: 'AI writing assistance' }))

    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument()
  })

  it('Given a 422 answer, should show the invalid alert', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 422 }))
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Add a model and an API key')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
