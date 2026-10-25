import { type ComponentProps, type ReactNode, useId } from 'react'

import { Input } from '../input/input'
import { cn } from '../lib/cn'

export type FieldProps = Omit<ComponentProps<'input'>, 'children'> & {
  label: string
  error?: string
  labelAction?: ReactNode
}

export const Field = ({ label, labelAction, error, id, className, ...props }: FieldProps) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  const labelElement = (
    <label htmlFor={inputId} className="text-sm font-medium text-foreground">
      {label}
    </label>
  )

  return (
    <div className="flex flex-col gap-1.5">
      {labelAction ? (
        <div className="flex items-center justify-between gap-2">
          {labelElement}
          {labelAction}
        </div>
      ) : (
        labelElement
      )}
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(error && 'border-danger', className)}
        {...props}
      />
      {error ? (
        <p id={errorId} className="animate-rise-in text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
