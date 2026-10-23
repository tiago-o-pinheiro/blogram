import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { ProfileStep } from './profile-step'
import { SetupWizardProvider, useSetupWizardState } from './setup-wizard-context'

const PROFILE = { name: 'Ada', description: 'Writer', hasPhoto: false }

const StepProbe = () => {
  const { step } = useSetupWizardState()
  return <p data-testid="step">{step}</p>
}

const renderStep = (initialProfile: typeof PROFILE | null = null) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <SetupWizardProvider initialProfile={initialProfile}>
        <ProfileStep />
        <StepProbe />
      </SetupWizardProvider>
    </I18nProvider>,
  )

const createObjectURL = vi.fn()
const revokeObjectURL = vi.fn()

beforeEach(() => {
  createObjectURL.mockReset().mockReturnValueOnce('blob:one').mockReturnValueOnce('blob:two')
  revokeObjectURL.mockReset()
  Object.assign(URL, { createObjectURL, revokeObjectURL })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProfileStep', () => {
  it('Given typing, should update the preview heading and description on every keystroke', async () => {
    const user = userEvent.setup()
    renderStep()

    await user.type(screen.getByLabelText('Name'), 'Grace')
    await user.type(screen.getByLabelText('Description'), 'Compiler')

    const preview = screen.getByRole('region', { name: 'Public profile preview' })
    expect(preview).toHaveTextContent('Grace')
    expect(preview).toHaveTextContent('Compiler')
    expect(screen.getByRole('heading', { level: 2, name: 'Grace' })).toBeVisible()
  })

  it('Given an empty name, should show the placeholder in the preview', () => {
    renderStep()

    expect(screen.getByRole('heading', { level: 2, name: 'Your name' })).toBeVisible()
  })

  it('Given a resumed draft, should prefill the fields and preview', () => {
    renderStep(PROFILE)

    expect(screen.getByLabelText('Name')).toHaveValue('Ada')
    expect(screen.getByLabelText('Description')).toHaveValue('Writer')
    expect(screen.getByRole('heading', { level: 2, name: 'Ada' })).toBeVisible()
  })

  it('Given a saved photo, should preview it from the profile photo path', () => {
    renderStep({ ...PROFILE, hasPhoto: true })

    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      '/api/profile/photo',
    )
  })

  it('Given a chosen photo, should preview it before saving and revoke the previous URL on change', async () => {
    const user = userEvent.setup()
    renderStep(PROFILE)
    const input = screen.getByLabelText('Profile photo')

    await user.upload(input, new File(['a'], 'a.png', { type: 'image/png' }))
    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      'blob:one',
    )

    await user.upload(input, new File(['b'], 'b.png', { type: 'image/png' }))
    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      'blob:two',
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one')
  })

  it('Given an unmount with a chosen photo, should revoke its URL', async () => {
    const user = userEvent.setup()
    const { unmount } = renderStep(PROFILE)
    await user.upload(
      screen.getByLabelText('Profile photo'),
      new File(['a'], 'a.png', { type: 'image/png' }),
    )

    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one')
  })

  it('Given a file that is not an accepted image, should show an alert and no preview image', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderStep(PROFILE)

    await user.upload(
      screen.getByLabelText('Profile photo'),
      new File(['t'], 't.txt', { type: 'text/plain' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image.')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('Given Continue with a photo, should save the profile before uploading the photo and go to step 2', async () => {
    const user = userEvent.setup()
    const saved = { name: 'Grace', description: '', hasPhoto: true }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(saved))
      .mockResolvedValueOnce(Response.json(saved))
    renderStep()

    await user.type(screen.getByLabelText('Name'), 'Grace')
    await user.upload(
      screen.getByLabelText('Profile photo'),
      new File(['a'], 'a.png', { type: 'image/png' }),
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await vi.waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('2'))
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
      '/api/setup/profile',
      '/api/setup/profile/photo',
    ])
  })

  it('Given an empty name, should disable Continue', () => {
    renderStep()

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('Given a failed save, should show the translated error and stay on step 1', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 422 }))
    renderStep()

    await user.type(screen.getByLabelText('Name'), 'Grace')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Some of the information is not valid.',
    )
    expect(screen.getByTestId('step')).toHaveTextContent('1')
  })

  it('Given a pending save, should disable the button and fields', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderStep()

    await user.type(screen.getByLabelText('Name'), 'Grace')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('button', { name: /Continue/ })).toBeDisabled()
    expect(screen.getByLabelText('Name')).toBeDisabled()
  })
})
