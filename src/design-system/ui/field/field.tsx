import { type ComponentProps, useId } from 'react'

import { Input } from '../input/input'
import { cn } from '../lib/cn'

export type FieldProps = Omit<ComponentProps<'input'>, 'children'> & {
  label: string
  error?: string
}

export const Field = ({ label, error, id, className, ...props }: FieldProps) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
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
