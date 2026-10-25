import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Select } from './select'

const renderSelect = (props: { error?: string; disabled?: boolean } = {}) =>
  render(
    <Select label="Language" {...props}>
      <option value="en">English</option>
      <option value="es">Espanol</option>
    </Select>,
  )

describe('Select', () => {
  it('Given a label, should name the select after it', () => {
    renderSelect()

    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument()
  })

  it('Given a chosen option, should keep the selected value', async () => {
    const user = userEvent.setup()
    renderSelect()

    await user.selectOptions(screen.getByLabelText('Language'), 'es')

    expect(screen.getByLabelText('Language')).toHaveValue('es')
  })

  it('Given an error, should flag the select invalid and describe it with the message', () => {
    renderSelect({ error: 'Pick a language' })

    const select = screen.getByLabelText('Language')

    expect(select).toBeInvalid()
    expect(select).toHaveAccessibleDescription('Pick a language')
  })

  it('Given no error, should not flag the select invalid', () => {
    renderSelect()

    expect(screen.getByLabelText('Language')).toBeValid()
  })

  it('Given a select, should hide the native arrow and draw its own chevron with room for it', () => {
    const { container } = renderSelect()

    const select = screen.getByLabelText('Language')
    expect(select).toHaveClass('appearance-none', 'pr-10')
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('Given the disabled prop, should disable the select', () => {
    renderSelect({ disabled: true })

    expect(screen.getByLabelText('Language')).toBeDisabled()
  })
})
