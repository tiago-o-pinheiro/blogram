import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MediaInput, type MediaInputLabels, type MediaInputProps, type MediaSelection } from '.'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/webm']
const MAX_BYTES = 10485760
const PHOTO_NAME = '::photo::.png'
const OTHER_NAME = '::other::.png'
const SAVED_SRC = '::saved::'

const LABELS: MediaInputLabels = {
  drop: 'Drop a photo here',
  release: 'Release to add',
  choose: 'Choose photo',
  replace: 'Replace',
  remove: 'Remove',
  undo: 'Undo',
  current: 'Current photo',
  formats: 'Accepted formats',
  maxSize: 'Up to 10 MB',
  formatSelected: (name) => `Selected ${name}`,
  formatTypeError: (name) => `${name} can't be used. Accepted formats: JPEG, PNG or WebP.`,
  formatSizeError: (name, size) => `${name} is ${size}. The limit is 10 MB.`,
}

type HarnessProps = Partial<Omit<MediaInputProps, 'value' | 'onChange'>> & {
  onChange?: (selection: MediaSelection | null) => void
}

const Harness = ({ onChange, ...props }: HarnessProps) => {
  const [value, setValue] = useState<MediaSelection | null>(null)

  return (
    <>
      <label htmlFor="media">Photo</label>
      <MediaInput
        id="media"
        name="file"
        kind="image"
        accept={IMAGE_TYPES}
        maxBytes={MAX_BYTES}
        labels={LABELS}
        {...props}
        value={value}
        onChange={(selection) => {
          setValue(selection)
          onChange?.(selection)
        }}
      />
    </>
  )
}

const createObjectURL = vi.fn()
const revokeObjectURL = vi.fn()

const toFile = (name: string, type = 'image/png') => new File(['::bytes::'], name, { type })

const toSizedFile = (name: string, size: number) => {
  const file = toFile(name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const toOversizeFile = (name: string) => toSizedFile(name, MAX_BYTES * 2)

type DragType = 'dragenter' | 'dragover' | 'dragleave' | 'drop'

type DragOptions = { files?: File[]; types?: string[]; relatedTarget?: Element }

const dispatchDrag = (
  target: Element,
  type: DragType,
  { files = [], types = ['Files'], relatedTarget }: DragOptions = {},
) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { files, types, dropEffect: 'none' } })
  Object.defineProperty(event, 'relatedTarget', { value: relatedTarget ?? null })
  act(() => {
    target.dispatchEvent(event)
  })
}

beforeEach(() => {
  createObjectURL.mockReset().mockReturnValueOnce('blob:one').mockReturnValueOnce('blob:two')
  revokeObjectURL.mockReset()
  Object.assign(URL, { createObjectURL, revokeObjectURL })
})

describe('MediaInput legend', () => {
  it('Given an empty image input, should list one chip per accepted format and the maximum size', () => {
    render(<Harness />)

    expect(screen.getAllByRole('listitem').map((chip) => chip.textContent)).toEqual([
      'JPEG',
      'PNG',
      'WebP',
    ])
    expect(screen.getByText('Up to 10 MB')).toBeVisible()
  })

  it('Given a video input with a note, should list the video formats and the note', () => {
    render(<Harness kind="video" accept={VIDEO_TYPES} labels={{ ...LABELS, note: '::note::' }} />)

    expect(screen.getAllByRole('listitem').map((chip) => chip.textContent)).toEqual(['MP4', 'WebM'])
    expect(screen.getByText('::note::')).toBeVisible()
  })

  it('Given a selected file, should keep the legend visible', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('Up to 10 MB')).toBeVisible()
  })

  it('Given the legend, should describe the choose button and the native input', () => {
    render(<Harness />)

    expect(screen.getByRole('button', { name: 'Choose photo' })).toHaveAccessibleDescription(
      /JPEG\s+PNG\s+WebP\s+Up to 10 MB/,
    )
    expect(screen.getByLabelText('Photo')).toHaveAccessibleDescription(
      /JPEG\s+PNG\s+WebP\s+Up to 10 MB/,
    )
  })
})

describe('MediaInput choosing', () => {
  it('Given an empty input, should offer a choose button that never submits a form', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    render(
      <form onSubmit={handleSubmit}>
        <Harness />
      </form>,
    )

    await user.click(screen.getByRole('button', { name: 'Choose photo' }))

    expect(screen.getByRole('button', { name: 'Choose photo' })).toHaveAttribute('type', 'button')
    expect(screen.getByText('Drop a photo here')).toBeVisible()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(handleSubmit).not.toHaveBeenCalled()
  })

  it('Given a valid image, should report it and preview it with its name and size', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    const file = toFile(PHOTO_NAME)
    render(<Harness alt="::alt::" onChange={handleChange} />)

    await user.upload(screen.getByLabelText('Photo'), file)

    expect(handleChange).toHaveBeenCalledExactlyOnceWith({ file, previewUrl: 'blob:one' })
    expect(screen.getByRole('img', { name: '::alt::' })).toHaveAttribute('src', 'blob:one')
    expect(screen.getByText(PHOTO_NAME)).toHaveAttribute('title', PHOTO_NAME)
    expect(screen.getByText('9 B')).toBeVisible()
  })

  it('Given a valid video, should preview it with controls', async () => {
    const user = userEvent.setup()
    render(<Harness kind="video" accept={VIDEO_TYPES} alt="::clip::" />)

    await user.upload(screen.getByLabelText('Photo'), toFile('::clip::.mp4', 'video/mp4'))

    expect(screen.getByLabelText('::clip::')).toHaveAttribute('src', 'blob:one')
    expect(screen.getByLabelText('::clip::')).toHaveAttribute('controls')
  })

  it('Given a video, should letterbox it on a dark backdrop', async () => {
    const user = userEvent.setup()
    render(<Harness kind="video" accept={VIDEO_TYPES} alt="::clip::" />)

    await user.upload(screen.getByLabelText('Photo'), toFile('::clip::.mp4', 'video/mp4'))

    expect(screen.getByLabelText('::clip::').parentElement).toHaveClass('bg-foreground')
  })

  it('Given a saved video and no selection, should letterbox it on a dark backdrop', () => {
    render(<Harness kind="video" accept={VIDEO_TYPES} savedSrc={SAVED_SRC} alt="::clip::" />)

    expect(screen.getByLabelText('::clip::').parentElement).toHaveClass('bg-foreground')
  })

  it('Given an image, should keep the muted backdrop behind it', () => {
    render(<Harness savedSrc={SAVED_SRC} alt="::alt::" />)

    expect(screen.getByRole('img', { name: '::alt::' }).parentElement).toHaveClass('bg-muted')
    expect(screen.getByRole('img', { name: '::alt::' }).parentElement).not.toHaveClass(
      'bg-foreground',
    )
  })

  it('Given a picked file, should clear the native input so the same file can be chosen again', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    const file = toFile(PHOTO_NAME)
    render(<Harness onChange={handleChange} />)

    await user.upload(screen.getByLabelText('Photo'), file)
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await user.upload(screen.getByLabelText('Photo'), file)

    expect(screen.getByLabelText('Photo')).toHaveValue('')
    expect(handleChange).toHaveBeenCalledTimes(3)
  })
})

describe('MediaInput dragging', () => {
  it('Given a file dragged over the frame, should show the release prompt until it leaves', () => {
    render(<Harness />)

    dispatchDrag(screen.getByText('Drop a photo here'), 'dragenter')

    expect(screen.getByText('Release to add')).toBeVisible()
    expect(screen.queryByText('Drop a photo here')).not.toBeInTheDocument()

    dispatchDrag(screen.getByText('Release to add'), 'dragleave')

    expect(screen.getByText('Drop a photo here')).toBeVisible()
  })

  it('Given the pointer moving onto an inner element, should keep the release prompt', () => {
    render(<Harness />)
    dispatchDrag(screen.getByText('Drop a photo here'), 'dragover')

    dispatchDrag(screen.getByText('Release to add'), 'dragleave', {
      relatedTarget: screen.getByRole('button', { name: 'Choose photo' }),
    })

    expect(screen.getByText('Release to add')).toBeVisible()
  })

  it('Given dragged content that is not a file, should not show the release prompt', () => {
    render(<Harness />)

    dispatchDrag(screen.getByText('Drop a photo here'), 'dragover', { types: ['text/plain'] })

    expect(screen.getByText('Drop a photo here')).toBeVisible()
  })

  it('Given a valid file dropped, should report it like a chosen one', () => {
    const handleChange = vi.fn()
    const file = toFile(PHOTO_NAME)
    render(<Harness onChange={handleChange} />)

    dispatchDrag(screen.getByText('Drop a photo here'), 'drop', { files: [file] })

    expect(handleChange).toHaveBeenCalledExactlyOnceWith({ file, previewUrl: 'blob:one' })
    expect(screen.getByText(PHOTO_NAME)).toBeVisible()
    expect(screen.queryByText('Release to add')).not.toBeInTheDocument()
  })

  it('Given a wrong type dropped, should alert and report nothing', () => {
    const handleChange = vi.fn()
    render(<Harness onChange={handleChange} />)

    dispatchDrag(screen.getByText('Drop a photo here'), 'drop', {
      files: [toFile('::anim::.gif', 'image/gif')],
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      "::anim::.gif can't be used. Accepted formats: JPEG, PNG or WebP.",
    )
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('Given a file dragged over a filled frame, should cover the preview with the release prompt', async () => {
    const user = userEvent.setup()
    render(<Harness alt="::alt::" />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    dispatchDrag(screen.getByRole('img', { name: '::alt::' }), 'dragover')

    expect(screen.getByText('Release to add')).toBeVisible()
  })

  it('Given a file dropped on the legend, should validate it like a chosen one', () => {
    const handleChange = vi.fn()
    const file = toFile(PHOTO_NAME)
    render(<Harness onChange={handleChange} />)

    dispatchDrag(screen.getByText('Up to 10 MB'), 'dragover')

    expect(screen.getByText('Release to add')).toBeVisible()

    dispatchDrag(screen.getByText('Up to 10 MB'), 'drop', { files: [file] })

    expect(handleChange).toHaveBeenCalledExactlyOnceWith({ file, previewUrl: 'blob:one' })
  })

  it('Given a file dropped on the avatar legend, should validate it like a chosen one', () => {
    const handleChange = vi.fn()
    const file = toFile(PHOTO_NAME)
    render(<Harness layout="avatar" onChange={handleChange} />)

    dispatchDrag(screen.getByText('Up to 10 MB'), 'drop', { files: [file] })

    expect(handleChange).toHaveBeenCalledExactlyOnceWith({ file, previewUrl: 'blob:one' })
  })

  it('Given a disabled input, should ignore a dropped file and show no release prompt', () => {
    const handleChange = vi.fn()
    render(<Harness isDisabled onChange={handleChange} />)

    dispatchDrag(screen.getByText('Drop a photo here'), 'dragover')
    dispatchDrag(screen.getByText('Drop a photo here'), 'drop', { files: [toFile(PHOTO_NAME)] })

    expect(screen.getByText('Drop a photo here')).toBeVisible()
    expect(handleChange).not.toHaveBeenCalled()
  })
})

describe('MediaInput replacing and removing', () => {
  it('Given a selection, should offer Replace where a new valid file wins', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    const replacement = toFile(OTHER_NAME)
    render(<Harness onChange={handleChange} />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    await user.upload(screen.getByLabelText('Photo'), replacement)

    expect(screen.getByRole('button', { name: 'Replace' })).toBeVisible()
    expect(handleChange).toHaveBeenLastCalledWith({ file: replacement, previewUrl: 'blob:two' })
    expect(screen.getByText(OTHER_NAME)).toBeVisible()
    expect(screen.queryByText(PHOTO_NAME)).not.toBeInTheDocument()
  })

  it('Given a click on Replace, should open the picker', async () => {
    const user = userEvent.setup()
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    render(<Harness />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    await user.click(screen.getByRole('button', { name: 'Replace' }))

    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('Given a click on Remove, should report no selection and restore the prompt', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Harness alt="::alt::" onChange={handleChange} />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(handleChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByText('Drop a photo here')).toBeVisible()
    expect(screen.queryByRole('img', { name: '::alt::' })).not.toBeInTheDocument()
  })

  it('Given a click on Remove, should move focus to the Choose button', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(screen.getByRole('button', { name: 'Choose photo' })).toHaveFocus()
  })

  it('Given a click on Undo, should move focus to Replace', async () => {
    const user = userEvent.setup()
    render(<Harness savedSrc={SAVED_SRC} />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByRole('button', { name: 'Replace' })).toHaveFocus()
  })

  it('Given a click on Remove on the avatar layout, should move focus to the Choose button', async () => {
    const user = userEvent.setup()
    render(<Harness layout="avatar" />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(screen.getByRole('button', { name: 'Choose photo' })).toHaveFocus()
  })

  it('Given a file picked without Remove, should not move focus to the Choose button', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    expect(screen.getByRole('button', { name: 'Replace' })).not.toHaveFocus()
  })

  it('Given a saved file and no selection, should show it with Replace and no Remove', () => {
    render(<Harness savedSrc={SAVED_SRC} alt="::alt::" />)

    expect(screen.getByRole('img', { name: '::alt::' })).toHaveAttribute('src', SAVED_SRC)
    expect(screen.getByRole('button', { name: 'Replace' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('Given a saved file and a selection, should read Undo and restore the saved media', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Harness savedSrc={SAVED_SRC} alt="::alt::" onChange={handleChange} />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    expect(screen.getByRole('img', { name: '::alt::' })).toHaveAttribute('src', 'blob:one')
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(handleChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByRole('img', { name: '::alt::' })).toHaveAttribute('src', SAVED_SRC)
  })
})

describe('MediaInput rejecting', () => {
  it('Given a wrong type, should alert with the file name and the formats that work', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const handleChange = vi.fn()
    render(<Harness onChange={handleChange} />)

    await user.upload(screen.getByLabelText('Photo'), toFile('::anim::.gif', 'image/gif'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      "::anim::.gif can't be used. Accepted formats: JPEG, PNG or WebP.",
    )
    expect(handleChange).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('Given an oversize file, should alert with its size and the limit', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Harness onChange={handleChange} />)

    await user.upload(screen.getByLabelText('Photo'), toOversizeFile('::big::.png'))

    expect(screen.getByRole('alert')).toHaveTextContent('::big::.png is 20 MB. The limit is 10 MB.')
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('Given a file exactly at the limit, should accept it', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    const file = toSizedFile(PHOTO_NAME, MAX_BYTES)
    render(<Harness onChange={handleChange} />)

    await user.upload(screen.getByLabelText('Photo'), file)

    expect(handleChange).toHaveBeenCalledExactlyOnceWith({ file, previewUrl: 'blob:one' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Given a file one byte over the limit, should reject it', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Harness onChange={handleChange} />)

    await user.upload(screen.getByLabelText('Photo'), toSizedFile('::big::.png', MAX_BYTES + 1))

    expect(screen.getByRole('alert')).toHaveTextContent(
      '::big::.png is 10.1 MB. The limit is 10 MB.',
    )
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('Given a rejected file after a valid one, should keep the previous selection and preview', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Harness alt="::alt::" onChange={handleChange} />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    await user.upload(screen.getByLabelText('Photo'), toOversizeFile('::big::.png'))

    expect(handleChange).toHaveBeenCalledOnce()
    expect(screen.getByRole('img', { name: '::alt::' })).toHaveAttribute('src', 'blob:one')
    expect(screen.getByText(PHOTO_NAME)).toBeVisible()
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('Given an alert on screen, should clear it on the next valid pick', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.upload(screen.getByLabelText('Photo'), toOversizeFile('::big::.png'))

    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Given an alert on screen, should clear it when the selection is removed', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))
    await user.upload(screen.getByLabelText('Photo'), toOversizeFile('::big::.png'))

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('MediaInput object URLs', () => {
  it('Given a replacement, should revoke the previous object URL', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    await user.upload(screen.getByLabelText('Photo'), toFile(OTHER_NAME))

    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:one')
  })

  it('Given a removal, should revoke the object URL', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:one')
  })

  it('Given an unmount with a selection, should revoke the object URL', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    unmount()

    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:one')
  })
})

describe('MediaInput accessibility', () => {
  it('Given the field label, should expose a hidden native file input with the field name', () => {
    render(<Harness />)

    const input = screen.getByLabelText('Photo')

    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('name', 'file')
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(input).toHaveAttribute('tabindex', '-1')
    expect(input).toHaveClass('sr-only')
  })

  it('Given a selection, should announce it politely without a status role', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    expect(screen.getByText(`Selected ${PHOTO_NAME}`)).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('Given a disabled input, should disable the native input and the buttons', () => {
    render(<Harness isDisabled />)

    expect(screen.getByLabelText('Photo')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Choose photo' })).toBeDisabled()
  })

  it('Given a disabled input with a selection, should disable Replace and Remove', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness />)
    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    rerender(<Harness isDisabled />)

    expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled()
  })
})

describe('MediaInput avatar layout', () => {
  it('Given an empty avatar, should offer the choose button and the legend', () => {
    render(<Harness layout="avatar" alt="::alt::" />)

    expect(screen.getByRole('button', { name: 'Choose photo' })).toHaveAttribute('type', 'button')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('img', { name: '::alt::' })).not.toBeInTheDocument()
  })

  it('Given a saved photo and no selection, should describe it instead of inviting a drop', () => {
    render(<Harness layout="avatar" savedSrc={SAVED_SRC} alt="::alt::" />)

    expect(screen.getByText('Current photo')).toBeVisible()
    expect(screen.queryByText('Drop a photo here')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace' })).toBeVisible()
  })

  it('Given a saved photo and a file dragged over, should show the release prompt', () => {
    render(<Harness layout="avatar" savedSrc={SAVED_SRC} alt="::alt::" />)

    dispatchDrag(screen.getByText('Current photo'), 'dragover')

    expect(screen.getByText('Release to add')).toBeVisible()
    expect(screen.queryByText('Current photo')).not.toBeInTheDocument()
  })

  it('Given a saved photo and a pick, should preview the pick and let Undo restore the saved one', async () => {
    const user = userEvent.setup()
    render(<Harness layout="avatar" savedSrc={SAVED_SRC} alt="::alt::" />)
    expect(screen.getByRole('img', { name: '::alt::' })).toHaveAttribute('src', SAVED_SRC)

    await user.upload(screen.getByLabelText('Photo'), toFile(PHOTO_NAME))

    expect(screen.getByRole('img', { name: '::alt::' })).toHaveAttribute('src', 'blob:one')
    expect(screen.getByText(PHOTO_NAME)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByRole('img', { name: '::alt::' })).toHaveAttribute('src', SAVED_SRC)
  })

  it('Given a file dropped on the avatar, should validate it like a chosen one', () => {
    const handleChange = vi.fn()
    const file = toFile(PHOTO_NAME)
    render(<Harness layout="avatar" onChange={handleChange} />)

    dispatchDrag(screen.getByText('Drop a photo here'), 'dragover')

    expect(screen.getByText('Release to add')).toBeVisible()

    dispatchDrag(screen.getByText('Release to add'), 'drop', { files: [file] })

    expect(handleChange).toHaveBeenCalledExactlyOnceWith({ file, previewUrl: 'blob:one' })
  })
})
