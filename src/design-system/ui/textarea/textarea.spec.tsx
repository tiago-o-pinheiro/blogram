import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Textarea } from './textarea'

describe('Textarea', () => {
  it('Given a label, should name the textarea after it', () => {
    render(<Textarea label="Caption" />)

    expect(screen.getByRole('textbox', { name: 'Caption' })).toBeInTheDocument()
  })

  it('Given typing, should keep the typed value', async () => {
    const user = userEvent.setup()
    render(<Textarea label="Caption" />)

    await user.type(screen.getByLabelText('Caption'), 'Hello')

    expect(screen.getByLabelText('Caption')).toHaveValue('Hello')
  })

  it('Given an error, should flag the textarea invalid and describe it with the message', () => {
    render(<Textarea label="Caption" error="Too long" />)

    const textarea = screen.getByLabelText('Caption')

    expect(textarea).toBeInvalid()
    expect(textarea).toHaveAccessibleDescription('Too long')
  })

  it('Given no error, should not flag the textarea invalid', () => {
    render(<Textarea label="Caption" />)

    expect(screen.getByLabelText('Caption')).toBeValid()
  })

  it('Given a label action, should render it beside the label and keep the textarea name', () => {
    render(<Textarea label="Caption" labelAction={<button type="button">Write</button>} />)

    expect(screen.getByRole('button', { name: 'Write' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Caption' })).toBeInTheDocument()
  })

  it('Given the disabled prop, should disable the textarea', () => {
    render(<Textarea label="Caption" disabled />)

    expect(screen.getByLabelText('Caption')).toBeDisabled()
  })
})
