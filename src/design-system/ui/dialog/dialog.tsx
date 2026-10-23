import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { type ComponentProps } from 'react'

import { cn } from '../lib/cn'

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content>
export type DialogHeaderProps = ComponentProps<'div'>
export type DialogFooterProps = ComponentProps<'div'>
export type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title>
export type DialogDescriptionProps = ComponentProps<typeof DialogPrimitive.Description>

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogContent = ({ className, children, ...props }: DialogContentProps) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-foreground/50" />
    <DialogPrimitive.Content
      className={cn(
        'fixed top-1/2 left-1/2 flex w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-md',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <X aria-hidden="true" className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
)

export const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
  <div className={cn('flex flex-col gap-1.5', className)} {...props} />
)

export const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
)

export const DialogTitle = ({ className, ...props }: DialogTitleProps) => (
  <DialogPrimitive.Title
    className={cn('text-lg leading-none font-semibold', className)}
    {...props}
  />
)

export const DialogDescription = ({ className, ...props }: DialogDescriptionProps) => (
  <DialogPrimitive.Description
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
)
