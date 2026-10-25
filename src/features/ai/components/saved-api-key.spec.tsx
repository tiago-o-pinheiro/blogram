import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SavedApiKey } from './saved-api-key'

const renderSavedKey = (props: Partial<Parameters<typeof SavedApiKey>[0]> = {}) =>
  render(
    <SavedApiKey
      label="API key"
      hint="TNUA"
      description="Saved key ending in TNUA"
      replaceLabel="Replace"
      disabled={false}
      onReplace={vi.fn()}
      {...props}
    />,
  )

describe('SavedApiKey', () => {
  it('Given a hint, should show the key masked with only its last characters', () => {
    renderSavedKey()

    const input = screen.getByLabelText('API key')
    expect(input).toHaveValue('••••••••••••TNUA')
    expect(input).toHaveAttribute('readonly')
    expect(input).toHaveAccessibleDescription('Saved key ending in TNUA')
  })

  it('Given a click on Replace, should call onReplace', async () => {
    const user = userEvent.setup()
    const onReplace = vi.fn()
    renderSavedKey({ onReplace })

    await user.click(screen.getByRole('button', { name: 'Replace' }))

    expect(onReplace).toHaveBeenCalledOnce()
  })

  it('Given the disabled prop, should disable Replace', () => {
    renderSavedKey({ disabled: true })

    expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled()
  })
})
