import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { MediaField, type MediaFieldProps } from './media-field'

const FIVE_MEGABYTES = 5 * 1024 ** 2
const OVERSIZE_BYTES = Models.DEFAULT_UPLOAD_MAX_IMAGE_BYTES * 2

const renderField = (props: Partial<MediaFieldProps> = {}, locale: 'en' | 'es' = 'en') =>
  render(
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <MediaField
        label="Profile photo"
        name="photo"
        kind="photo"
        maxBytes={Models.DEFAULT_UPLOAD_MAX_IMAGE_BYTES}
        value={null}
        onChange={vi.fn()}
        {...props}
      />
    </I18nProvider>,
  )

const toFile = (name: string, type: string) => new File(['::bytes::'], name, { type })

const toOversizeFile = (name: string) => {
  const file = toFile(name, 'image/png')
  Object.defineProperty(file, 'size', { value: OVERSIZE_BYTES })
  return file
}

const dispatchDrag = (target: Element, type: 'dragover' | 'drop', types: string[] = ['Files']) => {
  const dataTransfer = { files: [], types, dropEffect: 'copy' }
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
  act(() => {
    target.dispatchEvent(event)
  })
  return { isPrevented: event.defaultPrevented, dropEffect: dataTransfer.dropEffect }
}

beforeEach(() => {
  Object.assign(URL, { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() })
})

describe('MediaField', () => {
  it('Given a label, should name the file input after it', () => {
    renderField()

    expect(screen.getByLabelText('Profile photo')).toHaveAttribute('type', 'file')
    expect(screen.getByLabelText('Profile photo')).toHaveAttribute('name', 'photo')
  })

  it('Given a photo, should word the prompt and the button for a photo', () => {
    renderField()

    expect(screen.getByText('Drop a photo here')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Choose photo' })).toBeVisible()
  })

  it('Given an image, should word the prompt and the button for an image', () => {
    renderField({ kind: 'image' })

    expect(screen.getByText('Drop an image here')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Choose image' })).toBeVisible()
  })

  it('Given a video, should word the prompt and the button for a video', () => {
    renderField({ kind: 'video', maxBytes: Models.DEFAULT_UPLOAD_MAX_VIDEO_BYTES })

    expect(screen.getByText('Drop a video here')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Choose video' })).toBeVisible()
  })

  it('Given the es locale, should translate the prompt, the button and the limit', () => {
    renderField({ maxBytes: FIVE_MEGABYTES }, 'es')

    expect(screen.getByText('Suelta una foto aquí')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Elegir foto' })).toBeVisible()
    expect(screen.getByText('hasta 5 MB')).toBeVisible()
  })

  it.each([
    ['photo', 'Current photo'],
    ['image', 'Current image'],
    ['video', 'Current video'],
  ] as const)('Given a saved %s on the avatar layout, should read %s', (kind, expected) => {
    renderField({ kind, layout: 'avatar', savedSrc: '::saved::' })

    expect(screen.getByText(expected)).toBeVisible()
  })

  it('Given the es locale and a saved photo on the avatar layout, should read it in spanish', () => {
    renderField({ layout: 'avatar', savedSrc: '::saved::' }, 'es')

    expect(screen.getByText('Foto actual')).toBeVisible()
  })

  it('Given the es locale and a video, should translate the video prompt and note', () => {
    renderField({ kind: 'video', maxBytes: Models.DEFAULT_UPLOAD_MAX_VIDEO_BYTES }, 'es')

    expect(screen.getByText('Suelta un vídeo aquí')).toBeVisible()
    expect(screen.getByText('Los vídeos verticales también valen.')).toBeVisible()
  })
})

describe('MediaField dragging', () => {
  it('Given a file dragged over the label, should block it and refuse the drop', () => {
    renderField()

    const { isPrevented, dropEffect } = dispatchDrag(screen.getByText('Profile photo'), 'dragover')

    expect(isPrevented).toBe(true)
    expect(dropEffect).toBe('none')
  })

  it('Given a file dropped on the label, should keep the page and report nothing', () => {
    const handleChange = vi.fn()
    renderField({ onChange: handleChange })

    const { isPrevented } = dispatchDrag(screen.getByText('Profile photo'), 'drop')

    expect(isPrevented).toBe(true)
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('Given dragged content that is not a file, should leave it alone over the label', () => {
    renderField()

    const { isPrevented } = dispatchDrag(screen.getByText('Profile photo'), 'dragover', [
      'text/plain',
    ])

    expect(isPrevented).toBe(false)
  })

  it('Given a file dragged over the drop zone, should still allow the drop', () => {
    renderField()

    const { dropEffect } = dispatchDrag(screen.getByText('Drop a photo here'), 'dragover')

    expect(dropEffect).toBe('copy')
  })
})

describe('MediaField legend', () => {
  it('Given an image kind, should accept exactly the image types of the models', () => {
    renderField({ kind: 'image' })

    expect(screen.getByLabelText('Profile photo')).toHaveAttribute(
      'accept',
      Models.IMAGE_UPLOAD_TYPES.join(','),
    )
    expect(screen.getByText('JPEG, PNG or WebP')).toBeVisible()
  })

  it('Given a video kind, should accept exactly the video types of the models', () => {
    renderField({ kind: 'video' })

    expect(screen.getByLabelText('Profile photo')).toHaveAttribute(
      'accept',
      Models.VIDEO_UPLOAD_TYPES.join(','),
    )
    expect(screen.getByText('MP4 or WebM')).toBeVisible()
  })

  it('Given a limit, should show it in the legend that describes the input', () => {
    renderField({ maxBytes: Models.DEFAULT_UPLOAD_MAX_IMAGE_BYTES })

    expect(screen.getByText('up to 10 MB')).toBeVisible()
    expect(screen.getByLabelText('Profile photo')).toHaveAccessibleDescription(
      /JPEG, PNG or WebP, up to 10 MB/,
    )
  })

  it('Given a video, should add the vertical video note to the legend', () => {
    renderField({ kind: 'video', maxBytes: Models.DEFAULT_UPLOAD_MAX_VIDEO_BYTES })

    expect(screen.getByText('up to 256 MB')).toBeVisible()
    expect(screen.getByText('Vertical videos work too.')).toBeVisible()
  })

  it('Given a photo, should not show the vertical video note', () => {
    renderField()

    expect(screen.queryByText('Vertical videos work too.')).not.toBeInTheDocument()
  })
})

describe('MediaField selection', () => {
  it('Given a selection without alt text, should use the label as the preview alt text', () => {
    renderField({
      value: { file: toFile('::photo::.png', 'image/png'), previewUrl: '::preview::' },
    })

    expect(screen.getByRole('img', { name: 'Profile photo' })).toHaveAttribute('src', '::preview::')
  })

  it('Given alt text, should use it for the preview', () => {
    renderField({
      alt: '::alt::',
      value: { file: toFile('::photo::.png', 'image/png'), previewUrl: '::preview::' },
    })

    expect(screen.getByRole('img', { name: '::alt::' })).toHaveAttribute('src', '::preview::')
  })

  it('Given a valid file, should report it with a preview URL', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    const file = toFile('::photo::.png', 'image/png')
    vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:one')
    renderField({ onChange: handleChange })

    await user.upload(screen.getByLabelText('Profile photo'), file)

    expect(handleChange).toHaveBeenCalledExactlyOnceWith({ file, previewUrl: 'blob:one' })
  })
})

describe('MediaField rejection', () => {
  it('Given a wrong image type, should alert with the file and the accepted formats', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const handleChange = vi.fn()
    renderField({ onChange: handleChange })

    await user.upload(screen.getByLabelText('Profile photo'), toFile('::clip::.gif', 'image/gif'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      "::clip::.gif can't be used. Accepted formats: JPEG, PNG or WebP.",
    )
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('Given a wrong video type, should alert with the two video formats', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderField({ kind: 'video' })

    await user.upload(
      screen.getByLabelText('Profile photo'),
      toFile('::clip::.mov', 'video/quicktime'),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      "::clip::.mov can't be used. Accepted formats: MP4 or WebM.",
    )
  })

  it('Given an oversize file, should alert with its size and the limit', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    renderField({ onChange: handleChange })

    await user.upload(screen.getByLabelText('Profile photo'), toOversizeFile('::big::.png'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      '::big::.png is 20 MB. The limit is 10 MB, so choose a smaller file.',
    )
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('Given the es locale and a wrong type, should alert in spanish', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderField({}, 'es')

    await user.upload(screen.getByLabelText('Profile photo'), toFile('::clip::.gif', 'image/gif'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      '::clip::.gif no se puede usar. Formatos admitidos: JPEG, PNG o WebP.',
    )
  })

  it('Given the es locale and an oversize file, should alert in spanish', async () => {
    const user = userEvent.setup()
    renderField({}, 'es')

    await user.upload(screen.getByLabelText('Profile photo'), toOversizeFile('::big::.png'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      '::big::.png pesa 20 MB. El límite es 10 MB, así que elige un archivo más pequeño.',
    )
  })
})
