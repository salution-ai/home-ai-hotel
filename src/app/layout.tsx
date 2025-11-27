import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from 'next-themes'

export const metadata: Metadata = {
  title: 'Hotel Management System',
  description: 'Hotel Management System - Manage your hotel, guesthouse, or boarding house',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body className="bg-white">
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

