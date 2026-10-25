export const ACCOUNT_SECTIONS = ['security', 'ai', 'data'] as const

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number]

export const DEFAULT_ACCOUNT_SECTION: AccountSection = 'security'

export const toAccountSection = (value: string | string[] | undefined): AccountSection =>
  ACCOUNT_SECTIONS.find((section) => section === value) ?? DEFAULT_ACCOUNT_SECTION
