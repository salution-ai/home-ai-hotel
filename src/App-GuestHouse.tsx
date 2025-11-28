import { AppProvider, useApp } from './contexts/AppContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LoginScreen } from './components/LoginScreen';
import { GuestHouseLiveGrid } from './components/GuestHouseLiveGrid';
import { Toaster } from './components/ui/sonner';

/**
 * Guest House Management App - Nhà nghỉ/Khách sạn nhỏ
 * 
 * Features:
 * - Flexible rental: Hourly or Daily
 * - Quick check-in/check-out
 * - Incidental charges (minibar, room service)
 * - Revenue reports
 * - Simplified interface for small operations
 */

function GuestHouseAppContent() {
  const { user } = useApp();

  // Login/Setup
  if (!user) {
    return <LoginScreen />;
  }

  // Main app - Guest House LiveGrid
  return <GuestHouseLiveGrid />;
}

export default function GuestHouseApp() {
  return (
    <AppProvider defaultBusinessModel="guesthouse">
      <LanguageProvider>
        <GuestHouseAppContent />
        <Toaster position="top-right" richColors />
      </LanguageProvider>
    </AppProvider>
  );
}
