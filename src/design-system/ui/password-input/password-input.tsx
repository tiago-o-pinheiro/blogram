'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../button'
import { Input, type InputProps } from '../input'
import { cn } from '../lib/cn'

export type PasswordInputProps = Omit<InputProps, 'type'> & {
  showLabel: string
  hideLabel: string
}

export const PasswordInput = ({
  showLabel,
  hideLabel,
  className,
  disabled,
  ...props
}: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? 'text' : 'password'}
        disabled={disabled}
        className={cn('pr-14', className)}
      />
      <Button
        variant="ghost"
        className="absolute inset-y-0 right-1 my-auto size-11 rounded-md p-0 text-muted-foreground"
        aria-label={isVisible ? hideLabel : showLabel}
        aria-controls={props.id}
        title={isVisible ? hideLabel : showLabel}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        {isVisible ? (
          <EyeOff aria-hidden="true" className="size-4 animate-scale-in" />
        ) : (
          <Eye aria-hidden="true" className="size-4 animate-scale-in" />
        )}
      </Button>
    </div>
  )
}
