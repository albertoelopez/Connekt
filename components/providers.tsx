'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { UnreadCountsProvider } from '@/components/providers/unread-counts-provider'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <UnreadCountsProvider>
          {children}
        </UnreadCountsProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
