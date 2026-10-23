const FORMAT_LABELS: Readonly<Record<string, string>> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'video/mp4': 'MP4',
  'video/webm': 'WebM',
}

const SIZE_UNITS = [
  { label: 'GB', bytes: 1024 ** 3 },
  { label: 'MB', bytes: 1024 ** 2 },
  { label: 'KB', bytes: 1024 },
] as const

export const toFormatLabel = (mimeType: string): string =>
  FORMAT_LABELS[mimeType] ?? mimeType.split('/')[1]?.toUpperCase() ?? mimeType

type SizeRounding = 'nearest' | 'up'

export const formatFileSize = (bytes: number, rounding: SizeRounding = 'nearest'): string => {
  const round = rounding === 'up' ? Math.ceil : Math.round
  const unit = SIZE_UNITS.find(({ bytes: unitBytes }) => round((bytes / unitBytes) * 10) >= 10)
  if (!unit) {
    return `${round(bytes)} B`
  }
  return `${round((bytes / unit.bytes) * 10) / 10} ${unit.label}`
}
