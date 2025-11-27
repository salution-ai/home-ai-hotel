'use client'

import { useState } from 'react';
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

export function LoginScreen() {
  const { hotel, businessModel, login, setupHotel } = useApp();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [hotelName, setHotelName] = useState('');
  const [adminName, setAdminName] = useState('');

  const handleSetupHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessModel) {
      toast.error(t('login.errorSelectModel'));
      return;
    }
    setupHotel(hotelName, email, adminName, businessModel);
    setShowSetup(false);
    toast.success(t('login.setupSuccess'));
  };

  const handleGuestMode = () => {
    // Guest mode: login as admin with pre-set email
    if (!hotel) {
      setEmail('admin@hotel.com');
      setShowSetup(true);
    } else {
      setEmail(hotel.adminEmail);
      login(hotel.adminEmail, 'Admin');
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

        {/* Guest Mode Login */}
        <div className="mt-8">
          <Button
            type="button"
            className="w-full"
            onClick={handleGuestMode}
            size="lg"
          >
            {t('login.guestMode')}
          </Button>
        </div>
      </Card>

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
