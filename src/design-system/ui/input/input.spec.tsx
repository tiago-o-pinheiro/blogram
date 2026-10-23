import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Input } from './input'

describe('Input', () => {
  it('Given typed text, should keep the value', async () => {
    const user = userEvent.setup()
    render(<Input aria-label="Name" />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada')
  })

  it('Given the disabled prop, should reject typing', async () => {
    const user = userEvent.setup()
    render(<Input aria-label="Name" disabled />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
  })

  it('Given a type, should apply it', () => {
    render(<Input aria-label="Email" type="email" />)

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('type', 'email')
  })

  it('Given no type, should default to text', () => {
    render(<Input aria-label="Name" />)

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('type', 'text')
  })
})
