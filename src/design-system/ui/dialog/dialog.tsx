'use client'

import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { type ComponentProps, useEffect } from 'react'

import { cn } from '../lib/cn'

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content>
export type DialogHeaderProps = ComponentProps<'div'>
export type DialogFooterProps = ComponentProps<'div'>
export type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title>
export type DialogDescriptionProps = ComponentProps<typeof DialogPrimitive.Description>

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

const trackVisibleViewport = () => {
  const viewport = window.visualViewport
  if (!viewport) {
    return undefined
  }
  const root = document.documentElement
  const update = () => {
    const keyboardInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    root.style.setProperty('--keyboard-inset', `${Math.round(keyboardInset)}px`)
    root.style.setProperty('--visible-height', `${Math.round(viewport.height)}px`)
  }
  update()
  viewport.addEventListener('resize', update)
  viewport.addEventListener('scroll', update)
  return () => {
    viewport.removeEventListener('resize', update)
    viewport.removeEventListener('scroll', update)
    root.style.removeProperty('--keyboard-inset')
    root.style.removeProperty('--visible-height')
  }
}

const VisibleViewportTracker = () => {
  useEffect(trackVisibleViewport, [])
  return null
}

export const DialogContent = ({ className, children, ...props }: DialogContentProps) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim backdrop-blur-scrim state-open:animate-fade-in state-closed:animate-fade-out" />
    <DialogPrimitive.Content
      className={cn(
        'fixed inset-x-0 bottom-keyboard z-50 flex max-h-visible w-full flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-popover p-6 pb-sheet text-popover-foreground shadow-md outline-none',
        'state-open:animate-sheet-in state-closed:animate-sheet-out',
        'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-dvh sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-6',
        'sm:state-open:animate-scale-in sm:state-closed:animate-scale-out',
        className,
      )}
      {...props}
    >
      <VisibleViewportTracker />
      <span
        aria-hidden="true"
        className="mx-auto -mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden"
      />
      {children}
      <DialogPrimitive.Close className="absolute top-2 right-2 inline-flex size-11 press items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
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
