'use client'

import { type DragEvent, useId } from 'react'

import {
  formatFileSize,
  MediaInput,
  type MediaSelection,
  toFormatLabel,
} from '@/design-system/ui/media-input'
import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

export type MediaFieldProps = {
  name: string
  label: string
  kind: 'photo' | 'image' | 'video'
  layout?: 'frame' | 'avatar'
  maxBytes: number
  value: MediaSelection | null
  savedSrc?: string | null
  alt?: string
  isDisabled?: boolean
  onChange: (selection: MediaSelection | null) => void
}

const joinFormats = (formats: readonly string[], conjunction: string): string => {
  const last = formats.at(-1)
  if (formats.length < 2 || !last) {
    return formats.join('')
  }
  return `${formats.slice(0, -1).join(', ')} ${conjunction} ${last}`
}

const isFileDrag = (event: DragEvent<HTMLDivElement>): boolean =>
  Array.from(event.dataTransfer.types).includes('Files')

const handleStrayDragOver = (event: DragEvent<HTMLDivElement>) => {
  if (event.defaultPrevented || !isFileDrag(event)) {
    return
  }
  event.preventDefault()
  event.dataTransfer.dropEffect = 'none'
}

const handleStrayDrop = (event: DragEvent<HTMLDivElement>) => {
  if (isFileDrag(event)) {
    event.preventDefault()
  }
}

export const MediaField = ({
  name,
  label,
  kind,
  layout,
  maxBytes,
  value,
  savedSrc,
  alt,
  isDisabled,
  onChange,
}: MediaFieldProps) => {
  const t = useT()
  const id = useId()
  const accept = kind === 'video' ? Models.VIDEO_UPLOAD_TYPES : Models.IMAGE_UPLOAD_TYPES
  const formats = joinFormats(accept.map(toFormatLabel), t('mediaField.or'))
  const max = formatFileSize(maxBytes)

  return (
    <div
      className="flex w-full max-w-full min-w-0 flex-col gap-2"
      onDragEnter={handleStrayDragOver}
      onDragOver={handleStrayDragOver}
      onDrop={handleStrayDrop}
    >
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <MediaInput
        id={id}
        name={name}
        kind={kind === 'video' ? 'video' : 'image'}
        layout={layout}
        aspect={kind === 'photo' ? 'portrait' : 'landscape'}
        accept={accept}
        maxBytes={maxBytes}
        value={value}
        savedSrc={savedSrc}
        alt={alt ?? label}
        isDisabled={isDisabled}
        labels={{
          drop: t(`mediaField.drop.${kind}`),
          release: t('mediaField.release'),
          choose: t(`mediaField.choose.${kind}`),
          replace: t('mediaField.replace'),
          remove: t('mediaField.remove'),
          undo: t('mediaField.undo'),
          current: t(`mediaField.current.${kind}`),
          formats: t('mediaField.formats'),
          accepted: formats,
          maxSize: t('mediaField.maxSize', { max }),
          note: kind === 'video' ? t('mediaField.videoNote') : undefined,
          formatSelected: (fileName) => t('mediaField.selected', { name: fileName }),
          formatTypeError: (fileName) => t('mediaField.error.type', { name: fileName, formats }),
          formatSizeError: (fileName, size) =>
            t('mediaField.error.size', { name: fileName, size, max }),
        }}
        onChange={onChange}
      />
    </div>
  )
}
