'use client'

import { CircleAlert, ImageUp, Undo2, Upload, User, X } from 'lucide-react'
import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react'

import { Button } from '../button'
import { formatFileSize } from './media-format'
import { shrinkImage } from './shrink-image'
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
  accepted: string
  maxSize: string
  note?: string
  preparing?: string
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
  maxEdge?: number
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
        className="absolute inset-0 size-full media-backdrop animate-fade-in object-cover"
      />
      <PreviewImage
        key={src}
        src={src}
        alt={alt}
        className="relative size-full animate-fade-in object-contain"
      />
    </>
  )
}

const FileSummary = ({ file }: { file: File }) => (
  <p className="flex w-full max-w-full min-w-0 animate-rise-in items-baseline gap-2">
    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={file.name}>
      {file.name}
    </span>
    <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
  </p>
)

type MediaLegendProps = { id: string; labels: MediaInputLabels }

const PreparingOverlay = ({ label }: { label?: string }) => (
  <div className="absolute inset-0 z-10 flex animate-fade-in flex-col items-center justify-center gap-2 bg-accent-overlay text-sm font-medium text-primary">
    <span
      aria-hidden="true"
      className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
    {label ? <span className="sr-only sm:not-sr-only">{label}</span> : null}
  </div>
)

const MediaLegend = ({ id, labels }: MediaLegendProps) => (
  <div id={id} className="flex flex-col gap-1 text-xs text-muted-foreground">
    <p className="sr-only">{`${labels.formats}: ${labels.accepted}, ${labels.maxSize}`}</p>
    <p aria-hidden="true" className="flex flex-wrap gap-x-1.5">
      <span>{labels.accepted}</span>
      <span>·</span>
      <span>{labels.maxSize}</span>
    </p>
    {labels.note ? <p>{labels.note}</p> : null}
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
  maxEdge,
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
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const previewUrl = value?.previewUrl
  const src = previewUrl ?? savedSrc
  const legendId = `${id}-legend`
  const isLocked = isDisabled || isPreparing

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

  const acceptFile = (file: File) => {
    if (file.size > maxBytes) {
      setError(labels.formatSizeError(file.name, formatFileSize(file.size, 'up')))
      return
    }
    setError(null)
    setAnnouncement(labels.formatSelected(file.name))
    onChange({ file, previewUrl: URL.createObjectURL(file) })
  }

  const handleFile = (file: File) => {
    if (!accept.includes(file.type)) {
      setError(labels.formatTypeError(file.name))
      return
    }
    if (kind !== 'image' || !maxEdge) {
      acceptFile(file)
      return
    }
    setError(null)
    setIsPreparing(true)
    setAnnouncement(labels.preparing ?? '')
    void shrinkImage(file, maxEdge).then((prepared) => {
      setIsPreparing(false)
      acceptFile(prepared)
    })
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
    event.dataTransfer.dropEffect = isLocked ? 'none' : 'copy'
    setIsDragging(!isLocked)
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
    if (file && !isLocked) {
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
      disabled={isLocked}
      tabIndex={-1}
      aria-describedby={legendId}
      className="sr-only"
      onChange={handleInputChange}
    />
  )

  const details = (
    <>
      <MediaLegend id={legendId} labels={labels} />
      {error ? (
        <p
          key={error}
          role="alert"
          className="flex animate-rise-in items-start gap-2 text-sm text-danger"
        >
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
              'relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition',
              src
                ? 'border-transparent bg-muted'
                : 'border-dashed border-line-strong bg-surface text-muted-foreground',
              isDragging && 'border-primary bg-accent-soft ring-4 ring-accent-glow',
              isDisabled && 'opacity-disabled',
            )}
          >
            {src ? (
              <PreviewImage
                key={src}
                src={src}
                alt={alt}
                className="size-full animate-scale-in object-cover"
              />
            ) : (
              <User aria-hidden="true" className="size-8 animate-fade-in" />
            )}
            {isPreparing ? <PreparingOverlay /> : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            {value && !isDragging ? (
              <FileSummary key={value.previewUrl} file={value.file} />
            ) : (
              <p
                key={isDragging ? 'release' : 'idle'}
                className="animate-fade-in text-sm font-medium text-foreground"
              >
                {isPreparing ? labels.preparing : isDragging ? labels.release : idleLabel}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                ref={chooseRef}
                variant="secondary"
                disabled={isLocked}
                aria-describedby={legendId}
                onClick={handleChoose}
              >
                {chooseLabel}
              </Button>
              {value ? (
                <Button
                  variant="ghost"
                  className="animate-scale-in"
                  disabled={isLocked}
                  onClick={handleRemove}
                >
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
          'relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 transition',
          ASPECT_CLASSES[aspect],
          src ? 'border-transparent' : 'border-dashed border-line-strong bg-surface',
          src && (kind === 'video' ? 'bg-foreground' : 'bg-muted'),
          isDragging && 'border-primary bg-accent-soft ring-4 ring-accent-glow',
          isDisabled && 'opacity-disabled',
        )}
      >
        {src ? (
          <>
            <MediaPreview kind={kind} src={src} alt={alt} />
            <div className="absolute top-3 right-3 flex animate-scale-in gap-2">
              <Button
                ref={chooseRef}
                variant="glass"
                size="icon"
                className="rounded-full"
                disabled={isLocked}
                aria-label={chooseLabel}
                aria-describedby={legendId}
                title={chooseLabel}
                onClick={handleChoose}
              >
                <ImageUp aria-hidden="true" className="size-5" />
              </Button>
              {value ? (
                <Button
                  variant="glass"
                  size="icon"
                  className="rounded-full"
                  disabled={isLocked}
                  aria-label={removeLabel}
                  title={removeLabel}
                  onClick={handleRemove}
                >
                  {savedSrc ? (
                    <Undo2 aria-hidden="true" className="size-5" />
                  ) : (
                    <X aria-hidden="true" className="size-5" />
                  )}
                </Button>
              ) : null}
            </div>
            {isDragging ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex animate-fade-in items-center justify-center bg-accent-overlay text-base font-medium text-primary">
                {labels.release}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <span
              className={cn(
                'flex size-12 animate-scale-in items-center justify-center rounded-full bg-accent text-primary transition',
                isDragging && 'animate-pop',
              )}
            >
              <Upload aria-hidden="true" className="size-5" />
            </span>
            <p
              key={isDragging ? 'release' : 'drop'}
              className="animate-fade-in text-sm font-medium text-foreground"
            >
              {isDragging ? labels.release : labels.drop}
            </p>
            <Button
              ref={chooseRef}
              variant="secondary"
              disabled={isLocked}
              aria-describedby={legendId}
              onClick={handleChoose}
            >
              {labels.choose}
            </Button>
          </div>
        )}
        {isPreparing ? <PreparingOverlay label={labels.preparing} /> : null}
      </div>
      {value ? <FileSummary key={value.previewUrl} file={value.file} /> : null}
      {details}
    </div>
  )
}
