'use client'

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Hotel } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { businessModelInfo } from '../utils/businessModelFeatures';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, config: { theme?: string; size?: string; text?: string; width?: number }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function LoginScreen() {
  const { hotel, businessModel, login, signInWithGoogle, setupHotel, loading } = useApp();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [hotelName, setHotelName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [hiddenGoogleButtonRef, setHiddenGoogleButtonRef] = useState<HTMLDivElement | null>(null);

  // Load Google Identity Services script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if script is already loaded
    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      // Script exists, wait for it to load
      const handleLoad = () => initializeGoogle();
      existingScript.addEventListener('load', handleLoad);
      // Also check if it's already loaded
      if (window.google?.accounts?.id) {
        initializeGoogle();
      }
      return () => {
        existingScript.removeEventListener('load', handleLoad);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = initializeGoogle;
    document.head.appendChild(script);

    function initializeGoogle() {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (clientId && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              try {
                setIsLoggingIn(true);
                await signInWithGoogle(response.credential);
                setShowLogin(false);
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Google sign-in failed';
                toast.error(message);
              } finally {
                setIsLoggingIn(false);
              }
            },
          });
          setIsGoogleReady(true);
        } catch (error) {
          console.error('Failed to initialize Google Sign-In:', error);
        }
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, [signInWithGoogle]);

  // Render hidden Google button as fallback
  useEffect(() => {
    if (!isGoogleReady || !hiddenGoogleButtonRef || !window.google?.accounts?.id) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    // Clear any existing button
    hiddenGoogleButtonRef.innerHTML = '';

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (hiddenGoogleButtonRef && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.renderButton(hiddenGoogleButtonRef, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: 300,
          });
        } catch (error) {
          console.error('Failed to render Google button:', error);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (hiddenGoogleButtonRef) {
        hiddenGoogleButtonRef.innerHTML = '';
      }
    };
  }, [hiddenGoogleButtonRef, isGoogleReady]);

  // Handle custom Google button click
  const handleGoogleSignIn = () => {
    if (!isGoogleReady || !window.google?.accounts?.id) {
      toast.error('Google Sign-In is not ready yet. Please wait a moment and try again.');
      return;
    }

    // Try prompt() first (shows One Tap UI if available)
    try {
      window.google.accounts.id.prompt();
    } catch (error) {
      console.warn('prompt() failed, trying button click:', error);
    }

    // Also try clicking the hidden button as fallback/alternative
    // This ensures sign-in works even if One Tap was dismissed
    if (hiddenGoogleButtonRef) {
      // Wait a bit for the button to be rendered if it wasn't yet
      setTimeout(() => {
        const googleButton = hiddenGoogleButtonRef.querySelector('div[role="button"], button') as HTMLElement;
        if (googleButton) {
          googleButton.click();
        } else {
          // Try finding by ID pattern
          const clickableElement = hiddenGoogleButtonRef.querySelector('[id^="gsi"]') as HTMLElement;
          if (clickableElement) {
            clickableElement.click();
          }
        }
      }, 100);
    }
  };

  const handleSetupHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessModel) {
      toast.error(t('login.errorSelectModel'));
      return;
    }
    try {
      await setupHotel(hotelName, email, adminName, businessModel);
      setShowSetup(false);
      toast.success(t('login.setupSuccess'));
    } catch (error) {
      // Error already handled in setupHotel
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter username and password');
      return;
    }
    setIsLoggingIn(true);
    try {
      await login(email, password);
      setShowLogin(false);
      setEmail('');
      setPassword('');
      toast.success(t('login.success'));
    } catch (error) {
      // Error already handled in login
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestMode = () => {
    // Guest mode: login as admin with pre-set email
    if (!hotel) {
      setEmail('admin@hotel.com');
      setShowSetup(true);
    } else {
      setEmail(hotel.adminEmail);
      login(hotel.adminEmail, 'Admin').catch(() => {
        // Fallback to guest mode if API login fails
      });
      toast.success(t('login.success'));
    }
  };

  // Get business model info for display
  const modelInfo = businessModel ? businessModelInfo[businessModel] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hotel className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-gray-900 mb-2">Live Grid Hotel</h1>
          <p className="text-gray-500">{t('login.tagline')}</p>
          {modelInfo && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
              <span className="text-xl">{modelInfo.icon}</span>
              <span className="text-sm text-blue-900">{modelInfo.title}</span>
            </div>
          )}
        </div>

        {/* Login Options */}
        <div className="mt-8 space-y-3">
          <Button
            type="button"
            className="w-full"
            onClick={() => setShowLogin(true)}
            size="lg"
            disabled={loading}
          >
            {t('login.login') || 'Login'}
          </Button>
          
          {/* Hidden Google button container (used as fallback) */}
          <div 
            ref={(el) => setHiddenGoogleButtonRef(el)} 
            className="hidden"
            aria-hidden="true"
          ></div>
          
          {/* Custom styled Google button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
            disabled={loading || isLoggingIn || !isGoogleReady}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('login.loginWithGoogle') || 'Login with Google'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGuestMode}
            size="lg"
            disabled={loading}
          >
            {t('login.guestMode')}
          </Button>
        </div>
      </Card>

      {/* Login Dialog */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('login.login') || 'Login'}</DialogTitle>
            <DialogDescription>
              Enter your username and password to access your account
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                placeholder="Enter your username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoggingIn}
              />
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoggingIn}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Setup Hotel Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('login.setupTitle')}</DialogTitle>
            <DialogDescription>
              {t('login.setupDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSetupHotel} className="space-y-4">
            <div>
              <Label htmlFor="admin-name">{t('login.adminName')}</Label>
              <Input
                id="admin-name"
                placeholder={t('login.adminNamePlaceholder')}
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="hotel-name">{t('login.hotelName')}</Label>
              <Input
                id="hotel-name"
                placeholder={t('login.hotelNamePlaceholder')}
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                required
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-blue-900">
                {t('login.emailInfo')} ({email}) {t('login.emailInfoAdmin')}
              </p>
              {businessModel === 'hotel' && (
                <>
                  <p className="text-xs text-blue-700">
                    {t('login.demoStaffInfo')}
                  </p>
                  <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                    <li><strong>letan@demo.com</strong> - {t('login.demoReceptionist')}</li>
                    <li><strong>buongphong@demo.com</strong> - {t('login.demoHousekeeping')}</li>
                  </ul>
                </>
              )}
              {(businessModel === 'guesthouse' || businessModel === 'boarding-house') && (
                <p className="text-xs text-blue-700">
                  {businessModel === 'guesthouse' ? t('login.guesthouseInfo') : t('login.boardingHouseInfo')}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full">
              {t('login.completeSetup')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
