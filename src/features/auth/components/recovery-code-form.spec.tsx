import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { RecoveryCodeForm } from './recovery-code-form'

const CODE = 'ABCD-EFGH-JKMN'
const PASSWORD = '::new-password::-12345'
const messages = getMessages('en')

const submitCode = async (confirmation = PASSWORD) => {
  const user = userEvent.setup()
  render(
    <I18nProvider locale="en" messages={messages}>
      <RecoveryCodeForm />
    </I18nProvider>,
  )
  await user.type(screen.getByLabelText(messages['recovery.codes.code']), CODE)
  await user.type(screen.getByLabelText(messages['account.newPassword']), PASSWORD)
  await user.type(screen.getByLabelText(messages['account.confirmPassword']), confirmation)
  await user.click(screen.getByRole('button', { name: messages['recovery.reset'] }))
}

describe('RecoveryCodeForm', () => {
  it('Given a valid code, should confirm the reset and show the sign-in name', async () => {
    const redeem = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ identifier: 'journal.owner' }))

    await submitCode()

    expect(await screen.findByRole('status')).toHaveTextContent('journal.owner')
    expect(screen.getByRole('link', { name: messages['signin.submit'] })).toHaveAttribute(
      'href',
      '/sign-in',
    )
    expect(redeem.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ code: CODE, newPassword: PASSWORD }),
    )
  })

  it('Given a rejected code, should explain that it is invalid or used', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 401 }))

    await submitCode()

    expect(await screen.findByRole('alert')).toHaveTextContent(messages['recovery.codes.invalid'])
  })

  it('Given too many attempts, should ask to wait before retrying', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 429 }))

    await submitCode()

    expect(await screen.findByRole('alert')).toHaveTextContent(messages['recovery.rateLimit'])
  })

  it('Given different passwords, should not send the code', async () => {
    const redeem = vi.spyOn(globalThis, 'fetch')

    await submitCode('::other-password::')

    expect(screen.getByRole('alert')).toHaveTextContent(messages['account.errors.mismatch'])
    expect(redeem).not.toHaveBeenCalled()
  })
})
