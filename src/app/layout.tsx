import { type Metadata } from 'next'
import { type ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Blogram', template: '%s | Blogram' },
  description: 'Blogram web app',
}

type RootLayoutProps = {
  children: ReactNode
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en">
    <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
      {children}
    </body>
  </html>
)

export default RootLayout
