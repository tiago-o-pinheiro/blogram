import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { AiFieldButton } from './ai-field-button'
import { AiPromptBar } from './ai-prompt-bar'

const baseProps = {
  prompt: '',
  isDisabled: false,
  isGenerating: false,
  hasContext: true,
  messageKey: null,
  canUndo: false,
  onPromptChange: vi.fn(),
  onGenerateAll: vi.fn(),
  onUndo: vi.fn(),
} as const

const renderWith = (ui: React.ReactElement) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      {ui}
    </I18nProvider>,
  )

describe('AiPromptBar', () => {
  it('Given context, should call onGenerateAll when the button is pressed', async () => {
    const onGenerateAll = vi.fn()
    renderWith(<AiPromptBar {...baseProps} onGenerateAll={onGenerateAll} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Generate all' }))

    expect(onGenerateAll).toHaveBeenCalledOnce()
  })

  it('Given no context, should disable Generate all and show the hint', () => {
    renderWith(<AiPromptBar {...baseProps} hasContext={false} />)

    expect(screen.getByRole('button', { name: 'Generate all' })).toBeDisabled()
    expect(screen.getByText('Write a prompt or add a photo first')).toBeInTheDocument()
  })

  it('Given a request in flight, should disable the button and the prompt', () => {
    renderWith(<AiPromptBar {...baseProps} isDisabled isGenerating />)

    expect(screen.getByRole('button', { name: /Writing/ })).toBeDisabled()
    expect(screen.getByLabelText('Tell the AI about this post (optional)')).toBeDisabled()
  })

  it('Given a failure key, should render the matching alert', () => {
    renderWith(<AiPromptBar {...baseProps} messageKey="aiAssist.errors.rateLimit" />)

    expect(screen.getByRole('alert')).toHaveTextContent('The provider is busy')
  })

  it('Given the applied key and an undo snapshot, should show a status and an Undo that works', async () => {
    const onUndo = vi.fn()
    renderWith(<AiPromptBar {...baseProps} messageKey="aiAssist.applied" canUndo onUndo={onUndo} />)

    expect(screen.getByRole('status')).toHaveTextContent('Written by AI.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }))

    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('Given a typed prompt, should report it', async () => {
    const onPromptChange = vi.fn()
    renderWith(<AiPromptBar {...baseProps} onPromptChange={onPromptChange} />)

    await userEvent.setup().type(screen.getByLabelText(/Tell the AI/), 'a')

    expect(onPromptChange).toHaveBeenCalledWith('a')
  })
})

describe('AiFieldButton', () => {
  it('Given it is enabled, should call onClick', async () => {
    const onClick = vi.fn()
    renderWith(
      <AiFieldButton
        label="Write the title with AI"
        isPending={false}
        isDisabled={false}
        onClick={onClick}
      />,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Write the title with AI' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('Given it is disabled with a hint, should expose the hint as the title', () => {
    renderWith(
      <AiFieldButton
        label="Write the alt text with AI"
        isPending={false}
        isDisabled
        disabledHint="Add a photo first"
        onClick={vi.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: 'Write the alt text with AI' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Add a photo first')
  })

  it('Given it is pending, should be disabled and busy', () => {
    renderWith(
      <AiFieldButton
        label="Write the caption with AI"
        isPending
        isDisabled={false}
        onClick={vi.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: 'Write the caption with AI' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
