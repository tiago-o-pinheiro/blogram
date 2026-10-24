import { SHARE_CARD_COLORS } from './theme'

export const SHARE_CARD = {
  ...SHARE_CARD_COLORS,
  font: 'DejaVu Sans Mono, monospace',
  story: {
    width: 1080,
    height: 1920,
    inset: 72,
    imageTop: 280,
    imageWidth: 936,
    imageHeight: 1020,
    textTop: 1410,
    titleSize: 42,
    lineHeight: 64,
    maxLines: 5,
    lineLength: 34,
  },
  og: {
    width: 1200,
    height: 630,
    inset: 48,
    imageTop: 48,
    imageWidth: 500,
    imageHeight: 534,
    textTop: 250,
    titleSize: 32,
    lineHeight: 46,
    maxLines: 5,
    lineLength: 27,
  },
} as const
