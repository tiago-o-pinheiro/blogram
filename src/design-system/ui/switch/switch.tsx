import { Switch as SwitchPrimitive } from 'radix-ui'
import { type ComponentProps, useId } from 'react'

import { cn } from '../lib/cn'

export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root> & {
  label: string
  description?: string
}

export const Switch = ({ label, description, id, className, ...props }: SwitchProps) => {
  const generatedId = useId()
  const switchId = id ?? generatedId
  const descriptionId = `${switchId}-description`

  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={switchId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <SwitchPrimitive.Root
        id={switchId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 press items-center rounded-full bg-muted p-1 transition',
          'outline-2 outline-offset-2 outline-transparent focus-visible:outline-ring',
          'data-[state=checked]:bg-accent',
          'disabled:cursor-not-allowed disabled:opacity-disabled',
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-0 rounded-full bg-background shadow transition data-[state=checked]:translate-x-5" />
      </SwitchPrimitive.Root>
    </div>
  )
}
