import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { DEFAULT_UPLOAD_MAX_IMAGE_BYTES } from '@/models/models'

import { ProfileForm } from './profile-form'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const PROFILE = { name: 'Ada', description: 'Writer', hasPhoto: false }
const FIVE_MEGABYTES = 5 * 1024 ** 2

const renderForm = (profile = PROFILE, maxPhotoBytes = DEFAULT_UPLOAD_MAX_IMAGE_BYTES) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <ProfileForm profile={profile} maxPhotoBytes={maxPhotoBytes} />
    </I18nProvider>,
  )

const toPhoto = (name: string) => new File(['a'], name, { type: 'image/png' })

const createObjectURL = vi.fn()
const revokeObjectURL = vi.fn()

beforeEach(() => {
  refresh.mockReset()
  createObjectURL.mockReset().mockReturnValue('blob:one')
  revokeObjectURL.mockReset()
  Object.assign(URL, { createObjectURL, revokeObjectURL })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProfileForm', () => {
  it('Given a profile, should prefill the fields and the preview', () => {
    renderForm()

    expect(screen.getByLabelText('Name')).toHaveValue('Ada')
    expect(screen.getByLabelText('Description')).toHaveValue('Writer')
    expect(screen.getByRole('heading', { level: 2, name: 'Ada' })).toBeVisible()
  })

  it('Given typing, should update the live preview', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Grace')

    expect(screen.getByRole('heading', { level: 2, name: 'Grace' })).toBeVisible()
  })

  it('Given a saved photo, should preview it from the profile photo path', () => {
    renderForm({ ...PROFILE, hasPhoto: true })

    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      '/api/profile/photo?v=0',
    )
  })

  it('Given a photo limit, should show it in the legend of the photo input', () => {
    renderForm(PROFILE, FIVE_MEGABYTES)

    expect(screen.getByText('up to 5 MB')).toBeVisible()
    expect(screen.getByLabelText('Profile photo')).toHaveAccessibleDescription(/up to 5 MB/)
  })

  it('Given a file that is not an accepted image, should alert with its name and no preview', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderForm()

    await user.upload(
      screen.getByLabelText('Profile photo'),
      new File(['t'], 't.txt', { type: 'text/plain' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "t.txt can't be used. Accepted formats: JPEG, PNG or WebP.",
    )
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('Given an image over the given limit, should alert with the limit and no preview', async () => {
    const user = userEvent.setup()
    renderForm(PROFILE, FIVE_MEGABYTES)
    const file = toPhoto('big.png')
    Object.defineProperty(file, 'size', { value: FIVE_MEGABYTES * 2 })

    await user.upload(screen.getByLabelText('Profile photo'), file)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'big.png is 10 MB. The limit is 5 MB, so choose a smaller file.',
    )
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('Given a chosen photo, should preview it in the live profile through its object URL', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.upload(screen.getByLabelText('Profile photo'), toPhoto('a.png'))

    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      'blob:one',
    )
  })

  it('Given a saved photo and a chosen one, should restore the saved photo on Undo', async () => {
    const user = userEvent.setup()
    renderForm({ ...PROFILE, hasPhoto: true })

    await user.upload(screen.getByLabelText('Profile photo'), toPhoto('a.png'))
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      '/api/profile/photo?v=0',
    )
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:one')
  })

  it('Given Save with a photo, should save the profile then upload the photo and refresh', async () => {
    const user = userEvent.setup()
    const saved = { name: 'Ada', description: 'Writer', hasPhoto: true }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(saved))
      .mockResolvedValueOnce(Response.json(saved))
    renderForm()

    await user.upload(screen.getByLabelText('Profile photo'), toPhoto('a.png'))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Profile saved.')
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
      '/api/admin/profile',
      '/api/admin/profile/photo',
    ])
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('Given a saved upload, should show the new saved photo and revoke the object URL', async () => {
    const user = userEvent.setup()
    const saved = { name: 'Ada', description: 'Writer', hasPhoto: true }
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(saved))
      .mockResolvedValueOnce(Response.json(saved))
    renderForm()

    await user.upload(screen.getByLabelText('Profile photo'), toPhoto('a.png'))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('status')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Profile photo of Ada' })).toHaveAttribute(
      'src',
      '/api/profile/photo?v=1',
    )
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:one')
  })

  it('Given Save without a photo, should call only the profile endpoint', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(PROFILE))
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('status')).toBeVisible()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('Given an empty name, should disable Save', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByLabelText('Name'))

    expect(screen.getByRole('button', { name: 'Save profile' })).toBeDisabled()
  })

  it('Given a failed save, should show the translated error and not refresh', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 422 }))
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Some of the information is not valid.',
    )
    expect(refresh).not.toHaveBeenCalled()
  })

  it('Given a failed save and a newly chosen photo, should clear the server error', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 422 }))
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByRole('alert')).toBeVisible()

    await user.upload(screen.getByLabelText('Profile photo'), toPhoto('a.png'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Given a pending save, should disable the fields, the photo input and the button', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('button', { name: /Saving|Save profile/ })).toBeDisabled()
    expect(screen.getByLabelText('Name')).toBeDisabled()
    expect(screen.getByLabelText('Profile photo')).toBeDisabled()
  })
})
