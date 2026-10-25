import { ChevronDown } from 'lucide-react'
import { type ComponentProps, useId } from 'react'

import { cn } from '../lib/cn'

export type SelectProps = ComponentProps<'select'> & {
  label: string
  error?: string
}

export const Select = ({ label, error, id, className, children, ...props }: SelectProps) => {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'peer min-h-11 w-full appearance-none rounded-md border border-input bg-background pr-10 pl-3 text-base text-foreground',
            'outline-2 outline-offset-2 outline-transparent transition focus-visible:border-ring focus-visible:outline-ring',
            'disabled:cursor-not-allowed disabled:opacity-disabled',
            'aria-invalid:border-danger',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground transition peer-focus-visible:text-foreground peer-disabled:opacity-disabled"
        />
      </div>
      {error ? (
        <p id={errorId} className="animate-rise-in text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
