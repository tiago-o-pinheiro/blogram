const LIGHT = {
  background: '#ffffff',
  foreground: '#0f172a',
  surface: '#f8fafc',
  muted: '#f1f5f9',
  'muted-foreground': '#475569',
  primary: '#4338ca',
  'primary-foreground': '#ffffff',
  accent: '#e0e7ff',
  'accent-foreground': '#312e81',
  danger: '#b91c1c',
  'danger-foreground': '#ffffff',
  border: '#78879b',
  ring: '#6366f1',
  card: '#ffffff',
  'card-foreground': '#0f172a',
  popover: '#ffffff',
  'popover-foreground': '#0f172a',
  secondary: '#f1f5f9',
  'secondary-foreground': '#0f172a',
  input: '#78879b',
  'map-pin': '#4338ca',
  'map-pin-halo': '#ffffff',
  'elevation-sm': '0 1px 2px 0 rgb(15 23 42 / 0.08)',
  'elevation-md': '0 4px 12px -2px rgb(15 23 42 / 0.12)',
  'elevation-glass':
    '0 12px 32px -12px rgb(15 23 42 / 0.28), inset 0 1px 0 0 rgb(255 255 255 / 0.55)',
  'glass-tint': '25%',
  'glass-highlight': 'rgb(255 255 255 / 0.5)',
} as const

type Palette = Record<keyof typeof LIGHT, string>

const DARK: Palette = {
  background: '#0b1020',
  foreground: '#e2e8f0',
  surface: '#111827',
  muted: '#1e293b',
  'muted-foreground': '#94a3b8',
  primary: '#818cf8',
  'primary-foreground': '#0b1020',
  accent: '#1e1b4b',
  'accent-foreground': '#c7d2fe',
  danger: '#f87171',
  'danger-foreground': '#0b1020',
  border: '#64748b',
  ring: '#818cf8',
  card: '#111827',
  'card-foreground': '#e2e8f0',
  popover: '#111827',
  'popover-foreground': '#e2e8f0',
  secondary: '#1e293b',
  'secondary-foreground': '#e2e8f0',
  input: '#64748b',
  'map-pin': '#818cf8',
  'map-pin-halo': '#0b1020',
  'elevation-sm': '0 1px 2px 0 rgb(0 0 0 / 0.4)',
  'elevation-md': '0 4px 12px -2px rgb(0 0 0 / 0.5)',
  'elevation-glass': '0 12px 32px -12px rgb(0 0 0 / 0.6), inset 0 1px 0 0 rgb(255 255 255 / 0.08)',
  'glass-tint': '30%',
  'glass-highlight': 'rgb(255 255 255 / 0.14)',
}

export const THEMES = { light: LIGHT, dark: DARK } as const

const DERIVED = {
  'primary-hover': 'color-mix(in oklab, var(--primary) 90%, transparent)',
  'secondary-hover': 'color-mix(in oklab, var(--secondary) 80%, transparent)',
  'accent-hover': 'color-mix(in oklab, var(--accent) 80%, transparent)',
  'accent-soft': 'color-mix(in oklab, var(--accent) 40%, transparent)',
  'accent-overlay': 'color-mix(in oklab, var(--accent) 70%, transparent)',
  'accent-glow': 'color-mix(in oklab, var(--accent) 35%, transparent)',
  'danger-hover': 'color-mix(in oklab, var(--danger) 90%, transparent)',
  'danger-soft': 'color-mix(in oklab, var(--danger) 10%, transparent)',
  line: 'color-mix(in oklab, var(--border) 20%, transparent)',
  'line-strong': 'color-mix(in oklab, var(--border) 40%, transparent)',
  'surface-soft': 'color-mix(in oklab, var(--surface) 60%, transparent)',
  scrim: 'color-mix(in oklab, var(--foreground) 40%, transparent)',
  glass: 'color-mix(in oklab, var(--card) var(--glass-tint), transparent)',
} as const

export const MOTION = {
  fast: 120,
  base: 200,
  slow: 320,
  slower: 480,
  stagger: 45,
  easeOut: [0.16, 1, 0.3, 1],
  easeSpring: [0.34, 1.56, 0.64, 1],
} as const

const SHARED = {
  'corner-sm': '0.25rem',
  'corner-md': '0.5rem',
  'corner-lg': '0.75rem',
  'corner-xl': '1.25rem',
  'corner-2xl': '1.75rem',
  'corner-full': '9999px',
  'typeface-sans': "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  'typeface-mono': "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  'motion-fast': `${MOTION.fast}ms`,
  'motion-base': `${MOTION.base}ms`,
  'motion-slow': `${MOTION.slow}ms`,
  'motion-slower': `${MOTION.slower}ms`,
  'motion-stagger': `${MOTION.stagger}ms`,
  'motion-ease-out': `cubic-bezier(${MOTION.easeOut.join(', ')})`,
  'motion-ease-spring': `cubic-bezier(${MOTION.easeSpring.join(', ')})`,
  'motion-rise': '0.75rem',
  'motion-drop': '1.5rem',
  'motion-scale': '0.96',
  'motion-press': '0.96',
  'motion-pop': '1.3',
  'glass-blur': '1rem',
  'glass-saturate': '1.9',
  'glass-edge-width': '1px',
  'scrim-blur': '0.25rem',
  'backdrop-blur': '2.5rem',
  'backdrop-scale': '1.1',
  'opacity-disabled': '0.6',
  'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
  'nav-float': 'calc(0.75rem + var(--safe-bottom))',
  'admin-nav-space': 'calc(6.5rem + var(--safe-bottom))',
  'admin-dock-offset': 'calc(5.5rem + var(--safe-bottom))',
  'sheet-padding-bottom': 'calc(1.5rem + var(--safe-bottom))',
  'keyboard-inset': '0px',
  'visible-height': '100dvh',
  'map-height': '16rem',
  'map-pin-size': '1.75rem',
} as const

export const SHARE_CARD_COLORS = {
  background: LIGHT.surface,
  foreground: LIGHT.foreground,
  secondary: LIGHT['muted-foreground'],
  border: '#e2e8f0',
} as const

const toVariables = (tokens: Readonly<Record<string, string>>): string =>
  Object.entries(tokens)
    .map(([name, value]) => `--${name}:${value};`)
    .join('')

export const THEME_CSS = `:root{${toVariables({ ...SHARED, ...DERIVED, ...THEMES.light })}}.dark{${toVariables(THEMES.dark)}}`
