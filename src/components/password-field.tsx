'use client'

import { useId } from 'react'

import { PasswordInput, type PasswordInputProps } from '@/design-system/ui/password-input'
import { useT } from '@/i18n/i18n-context'

type PasswordFieldProps = Omit<PasswordInputProps, 'showLabel' | 'hideLabel'> & {
  label: string
  hint?: string
  error?: string
}

export const PasswordField = ({ label, hint, error, id, ...props }: PasswordFieldProps) => {
  const t = useT()
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = `${inputId}-description`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <PasswordInput
        {...props}
        id={inputId}
        showLabel={t('common.showPassword')}
        hideLabel={t('common.hidePassword')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? descriptionId : undefined}
      />
      {error || hint ? (
        <p
          id={descriptionId}
          className={
            error
              ? 'animate-rise-in text-sm text-danger'
              : 'text-xs leading-relaxed text-muted-foreground'
          }
        >
          {error || hint}
        </p>
      ) : null}
    </div>
  )
}
