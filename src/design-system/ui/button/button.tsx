import { cva, type VariantProps } from 'class-variance-authority'
import { type ComponentProps } from 'react'

import { cn } from '../lib/cn'

export const buttonVariants = cva(
  [
    'inline-flex min-w-11 items-center justify-center gap-2 rounded-md font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:cursor-not-allowed disabled:opacity-60',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        accent: 'bg-accent text-accent-foreground hover:bg-accent/80',
        ghost: 'bg-transparent text-foreground hover:bg-muted',
        destructive: 'bg-danger text-danger-foreground hover:bg-danger/90',
      },
      size: {
        sm: 'min-h-11 px-3 text-sm',
        md: 'min-h-11 px-4 text-base',
        lg: 'min-h-12 px-6 text-lg',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean
    loadingLabel?: string
  }

export const Button = ({
  variant,
  size,
  isLoading = false,
  loadingLabel = 'Loading',
  type = 'button',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || isLoading}
    aria-busy={isLoading || undefined}
    className={cn(buttonVariants({ variant, size }), className)}
    {...props}
  >
    {isLoading ? (
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
      />
    ) : null}
    {children}
    {isLoading ? <span className="sr-only">{loadingLabel}</span> : null}
  </button>
)
