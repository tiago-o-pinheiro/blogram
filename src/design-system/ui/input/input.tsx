import { type ComponentProps } from 'react'

import { cn } from '../lib/cn'

export type InputProps = ComponentProps<'input'>

export const Input = ({ type = 'text', className, ...props }: InputProps) => (
  <input
    type={type}
    className={cn(
      'min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground',
      'placeholder:text-muted-foreground',
      'outline-2 outline-offset-2 outline-transparent transition focus-visible:border-ring focus-visible:outline-ring',
      'disabled:cursor-not-allowed disabled:opacity-disabled',
      'aria-invalid:border-danger',
      className,
    )}
    {...props}
  />
)
