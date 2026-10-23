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

const renderStep = (initialProfile: typeof PROFILE | null = null, maxPhotoBytes?: number) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <SetupWizardProvider initialProfile={initialProfile}>
        <ProfileStep maxPhotoBytes={maxPhotoBytes} />
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

  it('Given no photo chosen, should offer a button that opens the file picker without submitting', async () => {
    const user = userEvent.setup()
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderStep()

    await user.click(screen.getByRole('button', { name: 'Choose photo' }))

    expect(screen.getByRole('button', { name: 'Choose photo' })).toHaveAttribute('type', 'button')
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(clickSpy.mock.contexts[0]).toBe(screen.getByLabelText('Profile photo'))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Given the default size limit, should state it in whole megabytes', () => {
    renderStep()

    expect(screen.getByText('JPEG, PNG or WebP, up to 10 MB.')).toBeVisible()
  })

  it('Given a chosen photo, should rename the button, show the file name and offer undo', async () => {
    const user = userEvent.setup()
    renderStep()

    await user.upload(
      screen.getByLabelText('Profile photo'),
      new File(['a'], 'a.png', { type: 'image/png' }),
    )

    expect(screen.getByRole('button', { name: 'Change photo' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Choose photo' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Selected: a.png')
    expect(screen.getByRole('button', { name: 'Undo' })).toBeVisible()
  })

  it('Given Undo after choosing a photo, should drop it, revoke its URL and restore the placeholder', async () => {
    const user = userEvent.setup()
    renderStep()
    await user.upload(
      screen.getByLabelText('Profile photo'),
      new File(['a'], 'a.png', { type: 'image/png' }),
    )

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one')
    expect(screen.getByRole('button', { name: 'Choose photo' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('Given Undo with a saved photo, should show the saved photo again', async () => {
    const user = userEvent.setup()
    renderStep({ ...PROFILE, hasPhoto: true })
    await user.upload(
      screen.getByLabelText('Profile photo'),
      new File(['a'], 'a.png', { type: 'image/png' }),
    )

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      '/api/profile/photo',
    )
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeVisible()
  })

  it('Given an image over the size limit, should show an alert and keep the previous photo', async () => {
    const user = userEvent.setup()
    renderStep(PROFILE, 5)
    const input = screen.getByLabelText('Profile photo')
    await user.upload(input, new File(['a'], 'a.png', { type: 'image/png' }))

    await user.upload(input, new File(['abcdef'], 'big.png', { type: 'image/png' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That file is too large.')
    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      'blob:one',
    )
    expect(screen.getByRole('status')).toHaveTextContent('Selected: a.png')
    expect(createObjectURL).toHaveBeenCalledOnce()
  })

  it('Given a file that is not an image after choosing a photo, should keep the previous photo', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderStep(PROFILE)
    const input = screen.getByLabelText('Profile photo')
    await user.upload(input, new File(['a'], 'a.png', { type: 'image/png' }))

    await user.upload(input, new File(['t'], 't.txt', { type: 'text/plain' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image.')
    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      'blob:one',
    )
    expect(createObjectURL).toHaveBeenCalledOnce()
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
