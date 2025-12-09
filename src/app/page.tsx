'use client'

import { AppProvider, useApp } from '@/contexts/AppContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { LoginScreen } from '@/components/LoginScreen'
import { GuestHouseLiveGrid } from '@/components/GuestHouseLiveGrid'
import { Toaster } from '@/components/ui/sonner'

function GuestHouseAppContent() {
  const { user } = useApp()

  if (!user) {
    return <LoginScreen />
  }

  return <GuestHouseLiveGrid />
}

export default function HomePage() {
  return (
    <AppProvider defaultBusinessModel="guesthouse">
      <LanguageProvider>
        <GuestHouseAppContent />
        <Toaster position="top-center" richColors />
      </LanguageProvider>
    </AppProvider>
  )
}

