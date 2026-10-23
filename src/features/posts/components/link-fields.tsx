'use client'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { Textarea } from '@/design-system/ui/textarea'
import { useT } from '@/i18n/i18n-context'

export type LinkFieldsValue = {
  url: string
  title: string
  description: string
  source: string
}

type LinkFieldsProps = {
  value: LinkFieldsValue
  isDisabled: boolean
  isFetching: boolean
  hasMetadataError: boolean
  onChange: (value: LinkFieldsValue) => void
  onFetchMetadata: () => void
}

export const LinkFields = ({
  value,
  isDisabled,
  isFetching,
  hasMetadataError,
  onChange,
  onFetchMetadata,
}: LinkFieldsProps) => {
  const t = useT()

  return (
    <div className="flex flex-col gap-4">
      <Field
        label={t('postForm.url')}
        name="url"
        type="url"
        required
        value={value.url}
        disabled={isDisabled}
        onChange={(event) => onChange({ ...value, url: event.target.value })}
      />
      <Button
        variant="secondary"
        disabled={isDisabled || !value.url.trim()}
        isLoading={isFetching}
        loadingLabel={t('postForm.metadataLoading')}
        onClick={onFetchMetadata}
      >
        {t('postForm.metadata')}
      </Button>
      {hasMetadataError ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t('postForm.metadataError')}
        </p>
      ) : null}
      <Field
        label={t('postForm.linkTitle')}
        name="title"
        required
        maxLength={300}
        value={value.title}
        disabled={isDisabled}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
      />
      <Textarea
        label={t('postForm.description')}
        name="description"
        rows={3}
        maxLength={1000}
        value={value.description}
        disabled={isDisabled}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
      />
      <Field
        label={t('postForm.source')}
        name="source"
        maxLength={300}
        value={value.source}
        disabled={isDisabled}
        onChange={(event) => onChange({ ...value, source: event.target.value })}
      />
    </div>
  )
}
