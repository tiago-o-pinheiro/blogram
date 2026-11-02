import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { ForgotPasswordForm } from './forgot-password-form'

const submitEmail = async (locale: 'en' | 'es' = 'en') => {
  const user = userEvent.setup()
  const messages = getMessages(locale)
  render(
    <I18nProvider locale={locale} messages={messages}>
      <ForgotPasswordForm />
    </I18nProvider>,
  )
  await user.type(screen.getByLabelText(messages['recovery.email']), 'owner@example.test')
  await user.click(screen.getByRole('button', { name: messages['recovery.send'] }))
}

describe('ForgotPasswordForm', () => {
  it.each(['en', 'es'] as const)(
    'Given an email in %s, should show the private recovery confirmation',
    async (locale) => {
      const delivery = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(Response.json({ status: true }))

      await submitEmail(locale)

      expect(await screen.findByRole('status')).toHaveTextContent(
        getMessages(locale)['recovery.sent'],
      )
      expect(String(delivery.mock.calls[0]?.[0])).toContain('/request-password-reset')
      expect(delivery.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({ email: 'owner@example.test', redirectTo: '/reset-password' }),
      )
    },
  )

  it('Given pending delivery, should block repeated recovery requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))

    await submitEmail()

    expect(screen.getByRole('button', { name: /Send recovery link/ })).toBeDisabled()
    expect(screen.getByLabelText('Owner email')).toBeDisabled()
  })

  it('Given an offline request, should show a retryable error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('::offline::'))

    await submitEmail()

    expect(await screen.findByRole('alert')).toHaveTextContent(getMessages('en')['recovery.error'])
    expect(screen.getByRole('button', { name: 'Send recovery link' })).toBeEnabled()
  })

  it('Given too many attempts, should explain the wait', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 429 }))

    await submitEmail()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      getMessages('en')['recovery.rateLimit'],
    )
  })
})
