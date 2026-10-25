import { type ComponentProps, type ReactNode, useId } from 'react'

import { cn } from '../lib/cn'

export type TextareaProps = Omit<ComponentProps<'textarea'>, 'children'> & {
  label: string
  error?: string
  labelAction?: ReactNode
}

export const Textarea = ({ label, labelAction, error, id, className, ...props }: TextareaProps) => {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const errorId = `${textareaId}-error`

  const labelElement = (
    <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
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
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground',
          'placeholder:text-muted-foreground',
          'outline-2 outline-offset-2 outline-transparent transition focus-visible:border-ring focus-visible:outline-ring',
          'disabled:cursor-not-allowed disabled:opacity-disabled',
          'aria-invalid:border-danger',
          className,
        )}
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
