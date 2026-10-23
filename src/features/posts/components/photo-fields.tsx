'use client'

import { type ChangeEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { Textarea } from '@/design-system/ui/textarea'
import { useT } from '@/i18n/i18n-context'
import { ALT_TEXT_MAX, POST_TEXT_MAX } from '@/models/models'

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type PhotoFieldsProps = {
  text: string
  altText: string
  previewSrc: string | null
  isEdit: boolean
  isDisabled: boolean
  onTextChange: (value: string) => void
  onAltTextChange: (value: string) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export const PhotoFields = ({
  text,
  altText,
  previewSrc,
  isEdit,
  isDisabled,
  onTextChange,
  onAltTextChange,
  onFileChange,
}: PhotoFieldsProps) => {
  const t = useT()
  const [isReplacing, setIsReplacing] = useState(false)

  return (
    <>
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt={altText || t('postForm.previewAlt')}
          className="max-h-96 w-full rounded-md object-contain"
        />
      ) : null}
      {isEdit && !isReplacing ? (
        <Button variant="secondary" disabled={isDisabled} onClick={() => setIsReplacing(true)}>
          {t('postForm.replaceImage')}
        </Button>
      ) : null}
      {isEdit && isReplacing ? (
        <div className="flex flex-col gap-2">
          <Field
            label={t('postForm.newImage')}
            name="file"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            disabled={isDisabled}
            onChange={onFileChange}
          />
          <Button variant="ghost" disabled={isDisabled} onClick={() => setIsReplacing(false)}>
            {t('postForm.cancelReplace')}
          </Button>
        </div>
      ) : null}
      {isEdit ? null : (
        <Field
          label={t('postForm.photo')}
          name="file"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          disabled={isDisabled}
          onChange={onFileChange}
        />
      )}
      <Field
        label={t('postForm.altText')}
        name="altText"
        value={altText}
        maxLength={ALT_TEXT_MAX}
        disabled={isDisabled}
        autoComplete="off"
        onChange={(event) => onAltTextChange(event.target.value)}
      />
      {altText.trim().length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('postForm.altTextHint')}</p>
      ) : null}
      <Textarea
        label={t('postForm.text')}
        name="text"
        value={text}
        maxLength={POST_TEXT_MAX}
        rows={4}
        disabled={isDisabled}
        onChange={(event) => onTextChange(event.target.value)}
      />
    </>
  )
}
