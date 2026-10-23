export const INSTALLATION_STATUSES = ['pending', 'completed'] as const
export type InstallationStatus = (typeof INSTALLATION_STATUSES)[number]

export const isInstallationStatus = (value: unknown): value is InstallationStatus =>
  INSTALLATION_STATUSES.some((status) => status === value)
