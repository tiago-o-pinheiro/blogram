import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { PasswordField } from './password-field'

const renderField = (
  props: Partial<Parameters<typeof PasswordField>[0]> = {},
  locale: 'en' | 'es' = 'en',
) =>
  render(
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <PasswordField label="Password" name="password" {...props} />
    </I18nProvider>,
  )

describe('PasswordField', () => {
  it('Given a label, should name the input after it', () => {
    renderField()

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('Given a click on the toggle, should reveal the typed value without losing it', async () => {
    const user = userEvent.setup()
    renderField()
    await user.type(screen.getByLabelText('Password'), '::password::')

    await user.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Password')).toHaveValue('::password::')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  })

  it('Given the es locale, should name the toggle in spanish', () => {
    renderField({}, 'es')

    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeInTheDocument()
  })

  it('Given a hint, should describe the input with it', () => {
    renderField({ hint: '::hint::' })

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('::hint::')
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-invalid')
  })

  it('Given an error, should mark the input invalid and describe it with the error', () => {
    renderField({ hint: '::hint::', error: '::error::' })

    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('::error::')
  })

  it('Given neither hint nor error, should leave the input without a description', () => {
    renderField()

    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-describedby')
  })

  it('Given a disabled field, should disable the toggle too', () => {
    renderField({ disabled: true })

    expect(screen.getByLabelText('Password')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled()
  })

  it('Given a max length, should cap the typed value', async () => {
    const user = userEvent.setup()
    renderField({ maxLength: 3 })

    await user.type(screen.getByLabelText('Password'), 'abcdef')

    expect(screen.getByLabelText('Password')).toHaveValue('abc')
  })
})
