import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type Models } from '@/models'

import { RecoveryCodes } from './recovery-codes'

const router = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const messages = getMessages('en')
const CODES = ['AAAA-BBBB-CCCC', 'DDDD-EEEE-FFFF']
const PASSWORD = '::password::-12345'
const EMPTY: Models.RecoveryCodeStatus = { remaining: 0, generatedAt: null }

const renderCodes = (status: Models.RecoveryCodeStatus = EMPTY) =>
  render(
    <I18nProvider locale="en" messages={messages}>
      <RecoveryCodes status={status} />
    </I18nProvider>,
  )

const generate = async (label: string) => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(messages['account.currentPassword']), PASSWORD)
  await user.click(screen.getByRole('button', { name: label }))
  return user
}

describe('RecoveryCodes', () => {
  it('Given no codes yet, should invite the owner to generate them', () => {
    renderCodes()

    expect(screen.getByText(messages['recovery.codes.none'])).toBeVisible()
    expect(screen.getByRole('button', { name: messages['recovery.codes.generate'] })).toBeEnabled()
  })

  it('Given unused codes, should show how many remain and warn about replacing them', () => {
    renderCodes({ remaining: 3, generatedAt: '2026-11-01T00:00:00.000Z' })

    expect(screen.getByText('3 of 8 codes left.')).toBeVisible()
    expect(screen.getByText(messages['recovery.codes.replaceHint'])).toBeVisible()
  })

  it('Given the right password, should show the new codes once with a download', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ codes: CODES }, { status: 201 }),
    )
    renderCodes()

    const user = await generate(messages['recovery.codes.generate'])

    const list = await screen.findByRole('list', { name: messages['recovery.codes.list'] })
    expect(list).toHaveTextContent(CODES.join(''))
    expect(screen.getByRole('link', { name: messages['recovery.codes.download'] })).toHaveAttribute(
      'download',
      'blogram-recovery-codes.txt',
    )
    expect(router.refresh).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: messages['recovery.codes.done'] }))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('Given a wrong password, should say the current password is wrong', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 403 }))
    renderCodes()

    await generate(messages['recovery.codes.generate'])

    expect(await screen.findByRole('alert')).toHaveTextContent(
      messages['recovery.codes.wrongPassword'],
    )
  })
})
