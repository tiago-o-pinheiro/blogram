import { type ComponentProps } from 'react'

import { cn } from '../lib/cn'

export type CardProps = ComponentProps<'div'>
export type CardHeaderProps = ComponentProps<'div'>
export type CardTitleProps = ComponentProps<'h3'>
export type CardDescriptionProps = ComponentProps<'p'>
export type CardContentProps = ComponentProps<'div'>
export type CardFooterProps = ComponentProps<'div'>

export const Card = ({ className, ...props }: CardProps) => (
  <div
    className={cn(
      'flex flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm',
      className,
    )}
    {...props}
  />
)

export const CardHeader = ({ className, ...props }: CardHeaderProps) => (
  <div className={cn('flex flex-col gap-1.5', className)} {...props} />
)

export const CardTitle = ({ className, ...props }: CardTitleProps) => (
  <h3 className={cn('text-lg leading-none font-semibold', className)} {...props} />
)

export const CardDescription = ({ className, ...props }: CardDescriptionProps) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
)

export const CardContent = ({ className, ...props }: CardContentProps) => (
  <div className={cn('flex flex-col gap-2', className)} {...props} />
)

export const CardFooter = ({ className, ...props }: CardFooterProps) => (
  <div className={cn('flex items-center gap-2', className)} {...props} />
)
