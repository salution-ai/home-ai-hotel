'use client'

import { AppProvider, useApp } from '@/contexts/AppContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { MenuProvider } from '@/contexts/MenuContext'
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
        <MenuProvider>
          <GuestHouseAppContent />
          <Toaster position="top-center" richColors />
        </MenuProvider>
      </LanguageProvider>
    </AppProvider>
  )
}

