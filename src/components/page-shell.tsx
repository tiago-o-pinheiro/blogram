import { type ReactNode } from 'react'

import { cn } from '@/design-system/ui/lib/cn'

type PageShellProps = {
  title: string
  description?: string
  isWide?: boolean
  children: ReactNode
}

export const PageShell = ({ title, description, isWide = false, children }: PageShellProps) => (
  <main className={cn('min-h-dvh', isWide && 'bg-surface')}>
    <div
      className={cn('mx-auto flex flex-col p-6', isWide ? 'max-w-5xl gap-8' : 'max-w-2xl gap-6')}
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </div>
  </main>
)
