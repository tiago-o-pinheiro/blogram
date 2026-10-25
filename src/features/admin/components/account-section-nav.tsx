'use client'

import { Database, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/design-system/ui/lib/cn'
import { SlidingPill } from '@/design-system/ui/sliding-pill'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'

import { type AccountSection } from '@/features/admin/lib/account-sections'

type AccountSectionNavProps = {
  activeSection: AccountSection
}

type SectionItem = {
  section: AccountSection
  icon: LucideIcon
  labelKey: TranslationKey
}

const SECTION_ITEMS: readonly SectionItem[] = [
  { section: 'security', icon: ShieldCheck, labelKey: 'account.sections.security' },
  { section: 'ai', icon: Sparkles, labelKey: 'account.sections.ai' },
  { section: 'data', icon: Database, labelKey: 'account.sections.data' },
]

export const AccountSectionNav = ({ activeSection }: AccountSectionNavProps) => {
  const t = useT()

  return (
    <nav aria-label={t('account.sections.label')} className="animate-rise-in">
      <ul className="relative flex items-center gap-1 rounded-full border border-line bg-card p-1">
        <SlidingPill activeKey={activeSection} className="rounded-full bg-accent shadow-sm" />
        {SECTION_ITEMS.map((item) => {
          const isCurrent = item.section === activeSection
          return (
            <li key={item.section} className="flex-1">
              <Link
                href={`?section=${item.section}`}
                aria-current={isCurrent ? 'page' : undefined}
                data-active={isCurrent || undefined}
                className={cn(
                  'relative flex min-h-11 min-w-11 press items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium',
                  'focus-visible:outline-2 focus-visible:outline-ring',
                  isCurrent
                    ? 'bg-accent text-accent-foreground pill-ready:bg-transparent'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon aria-hidden="true" className="size-5" />
                {t(item.labelKey)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
