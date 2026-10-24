'use client'

import { CircleAlert, Upload, User } from 'lucide-react'
import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react'

import { Button } from '../button'
import { formatFileSize, toFormatLabel } from './media-format'
import { cn } from '../lib/cn'

export type MediaSelection = { file: File; previewUrl: string }

export type MediaInputLabels = {
  drop: string
  release: string
  choose: string
  replace: string
  remove: string
  undo: string
  current: string
  formats: string
  maxSize: string
  note?: string
  formatSelected: (name: string) => string
  formatTypeError: (name: string) => string
  formatSizeError: (name: string, size: string) => string
}

export type MediaInputProps = {
  id: string
  name: string
  kind: 'image' | 'video'
  layout?: 'frame' | 'avatar'
  aspect?: 'portrait' | 'landscape'
  accept: readonly string[]
  maxBytes: number
  value: MediaSelection | null
  savedSrc?: string | null
  alt?: string
  isDisabled?: boolean
  labels: MediaInputLabels
  onChange: (selection: MediaSelection | null) => void
}

const ASPECT_CLASSES = { portrait: 'aspect-4/5', landscape: 'aspect-video' } as const

type PreviewImageProps = { src: string; alt: string; className: string; isHidden?: boolean }

const PreviewImage = ({ src, alt, className, isHidden = false }: PreviewImageProps) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} aria-hidden={isHidden || undefined} className={className} />
)

type MediaPreviewProps = { kind: 'image' | 'video'; src: string; alt: string }

const MediaPreview = ({ kind, src, alt }: MediaPreviewProps) => {
  if (kind === 'video') {
    return (
      <video
        src={src}
        aria-label={alt || undefined}
        controls
        preload="metadata"
        playsInline
        className="relative size-full object-contain"
      />
    )
  }
  return (
    <>
      <PreviewImage
        src={src}
        alt=""
        isHidden
        className="absolute inset-0 size-full scale-110 object-cover blur-2xl"
      />
      <PreviewImage src={src} alt={alt} className="relative size-full object-contain" />
    </>
  )
}

const FileSummary = ({ file }: { file: File }) => (
  <p className="flex w-full max-w-full min-w-0 items-baseline gap-2">
    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={file.name}>
      {file.name}
    </span>
    <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
  </p>
)

type MediaLegendProps = { id: string; accept: readonly string[]; labels: MediaInputLabels }

const MediaLegend = ({ id, accept, labels }: MediaLegendProps) => (
  <div id={id} className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
    <p className="sr-only">{labels.formats}</p>
    <ul className="flex flex-wrap gap-1.5">
      {accept.map((mimeType) => (
        <li
          key={mimeType}
          className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
        >
          {toFormatLabel(mimeType)}
        </li>
      ))}
    </ul>
    <p className="text-muted-foreground">{labels.maxSize}</p>
    {labels.note ? <p className="text-muted-foreground">{labels.note}</p> : null}
  </div>
)

export const MediaInput = ({
  id,
  name,
  kind,
  layout = 'frame',
  aspect = 'landscape',
  accept,
  maxBytes,
  value,
  savedSrc = null,
  alt = '',
  isDisabled = false,
  labels,
  onChange,
}: MediaInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const chooseRef = useRef<HTMLButtonElement>(null)
  const shouldFocusChooseRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const previewUrl = value?.previewUrl
  const src = previewUrl ?? savedSrc
  const legendId = `${id}-legend`

  useEffect(() => {
    if (previewUrl) {
      return () => URL.revokeObjectURL(previewUrl)
    }
    return undefined
  }, [previewUrl])

  useEffect(() => {
    if (shouldFocusChooseRef.current) {
      shouldFocusChooseRef.current = false
      chooseRef.current?.focus()
    }
  })

  const handleFile = (file: File) => {
    if (!accept.includes(file.type)) {
      setError(labels.formatTypeError(file.name))
      return
    }
    if (file.size > maxBytes) {
      setError(labels.formatSizeError(file.name, formatFileSize(file.size, 'up')))
      return
    }
    setError(null)
    setAnnouncement(labels.formatSelected(file.name))
    onChange({ file, previewUrl: URL.createObjectURL(file) })
  }

  const handleChoose = () => {
    inputRef.current?.click()
  }

  const handleRemove = () => {
    shouldFocusChooseRef.current = true
    setError(null)
    setAnnouncement('')
    onChange(null)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0)
    event.target.value = ''
    if (file) {
      handleFile(file)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = isDisabled ? 'none' : 'copy'
    setIsDragging(!isDisabled)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return
    }
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = Array.from(event.dataTransfer.files)[0]
    if (file && !isDisabled) {
      handleFile(file)
    }
  }

  const input = (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="file"
      accept={accept.join(',')}
      disabled={isDisabled}
      tabIndex={-1}
      aria-describedby={legendId}
      className="sr-only"
      onChange={handleInputChange}
    />
  )

  const details = (
    <>
      <MediaLegend id={legendId} accept={accept} labels={labels} />
      {error ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  )

  const chooseLabel = src ? labels.replace : labels.choose
  const removeLabel = savedSrc ? labels.undo : labels.remove
  const idleLabel = src ? labels.current : labels.drop

  if (layout === 'avatar') {
    return (
      <div
        className="flex w-full max-w-full min-w-0 flex-col gap-3"
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {input}
        <div className="flex w-full min-w-0 items-center gap-4">
          <div
            className={cn(
              'relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-colors motion-reduce:transition-none',
              src
                ? 'border-transparent bg-muted'
                : 'border-dashed border-border/40 bg-surface text-muted-foreground',
              isDragging && 'border-primary bg-accent/40',
              isDisabled && 'opacity-60',
            )}
          >
            {src ? (
              <PreviewImage src={src} alt={alt} className="size-full object-cover" />
            ) : (
              <User aria-hidden="true" className="size-8" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            {value && !isDragging ? (
              <FileSummary file={value.file} />
            ) : (
              <p className="text-sm font-medium text-foreground">
                {isDragging ? labels.release : idleLabel}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                ref={chooseRef}
                variant="secondary"
                disabled={isDisabled}
                aria-describedby={legendId}
                onClick={handleChoose}
              >
                {chooseLabel}
              </Button>
              {value ? (
                <Button variant="ghost" disabled={isDisabled} onClick={handleRemove}>
                  {removeLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        {details}
      </div>
    )
  }

  return (
    <div
      className={cn('flex w-full min-w-0 flex-col gap-3', aspect === 'portrait' && 'max-w-md')}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {input}
      <div
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 transition-colors motion-reduce:transition-none',
          ASPECT_CLASSES[aspect],
          src ? 'border-transparent' : 'border-dashed border-border/40 bg-surface',
          src && (kind === 'video' ? 'bg-foreground' : 'bg-muted'),
          isDragging && 'border-primary bg-accent/40',
          isDisabled && 'opacity-60',
        )}
      >
        {src ? (
          <>
            <MediaPreview kind={kind} src={src} alt={alt} />
            <div
              className={cn(
                'absolute inset-x-3 flex items-center justify-end gap-2 rounded-full border border-border/20 bg-card/70 p-1.5 pl-4 shadow-md backdrop-blur-md',
                kind === 'video' ? 'top-3' : 'bottom-3',
              )}
            >
              {value ? (
                <div className="mr-auto flex min-w-0 flex-1">
                  <FileSummary file={value.file} />
                </div>
              ) : null}
              <Button
                ref={chooseRef}
                variant="secondary"
                size="sm"
                className="rounded-full"
                disabled={isDisabled}
                aria-describedby={legendId}
                onClick={handleChoose}
              >
                {chooseLabel}
              </Button>
              {value ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  disabled={isDisabled}
                  onClick={handleRemove}
                >
                  {removeLabel}
                </Button>
              ) : null}
            </div>
            {isDragging ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-accent/70 text-base font-medium text-primary">
                {labels.release}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
              <Upload aria-hidden="true" className="size-5" />
            </span>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? labels.release : labels.drop}
            </p>
            <Button
              ref={chooseRef}
              variant="secondary"
              disabled={isDisabled}
              aria-describedby={legendId}
              onClick={handleChoose}
            >
              {labels.choose}
            </Button>
          </div>
        )}
      </div>
      {details}
    </div>
  )
}
