'use client'

import { Home, LogOut, UserPlus, Users, Building2, Settings, Trash2, CreditCard } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useBusinessModel } from '../hooks/useBusinessModel';
import { useLanguage } from '../contexts/LanguageContext';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { BankAccountManagement } from './BankAccountManagement';
import { SubscriptionStatus } from './SubscriptionStatus';

interface AppMenuProps {
  open: boolean;
  onClose: () => void;
}

export function AppMenu({ open, onClose }: AppMenuProps) {
  const { user, hotel, logout, addStaff, updateHotelInfo, updateBankAccount } = useApp();
  const { features, isBoardingHouse, isGuestHouse } = useBusinessModel();
  const { t } = useLanguage();
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showHotelConfig, setShowHotelConfig] = useState(false);
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'receptionist' | 'housekeeping'>('receptionist');
  const [hotelName, setHotelName] = useState(hotel?.name || '');
  const [hotelAddress, setHotelAddress] = useState(hotel?.address || '');
  const [taxCode, setTaxCode] = useState(hotel?.taxCode || '');
  const [phoneNumber, setPhoneNumber] = useState(hotel?.phoneNumber || '');
  const [email, setEmail] = useState(hotel?.email || '');

  const isAdmin = user?.role === 'admin';

  // Sync form state when hotel changes
  useEffect(() => {
    if (hotel) {
      setHotelName(hotel.name || '');
      setHotelAddress(hotel.address || '');
      setTaxCode(hotel.taxCode || '');
      setPhoneNumber(hotel.phoneNumber || '');
      setEmail(hotel.email || '');
    }
  }, [hotel]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addStaff(staffEmail, staffName, staffRole);
      toast.success(`${t('menu.staffAdded')} ${staffName}!`);
      setShowAddStaff(false);
      setStaffName('');
      setStaffEmail('');
      setStaffRole('receptionist');
    } catch (error) {
      // Error already handled in AppContext
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[85vw] sm:w-80 flex flex-col">
        <SheetHeader>
          <SheetTitle>{hotel?.name}</SheetTitle>
          <SheetDescription>{t('menu.main')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-6 space-y-2 pb-4">
          {/* Subscription Status - Above Room Map */}
          <SubscriptionStatus appSlug="guesthouse" className="mb-4" />

          {/* Always visible */}
          <Button variant="ghost" className="w-full justify-start" onClick={onClose}>
            <Home className="w-5 h-5 mr-3" />
            {t('menu.roomMap')}
          </Button>

          {/* Admin only */}
          {isAdmin && (
            <>
              <Separator className="my-4" />

              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => {
                  setShowHotelConfig(true);
                  onClose();
                }}
              >
                <Building2 className="w-5 h-5 mr-3" />
                {isBoardingHouse ? t('menu.configBoardingHouse') : isGuestHouse ? t('menu.configGuestHouse') : t('menu.configHotel')}
              </Button>

              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => {
                  setShowBankAccount(true);
                  onClose();
                }}
              >
                <CreditCard className="w-5 h-5 mr-3" />
                {t('menu.bankAccount')}
              </Button>

              {/* Staff Management - Only for hotels with staff */}
              {features.staffManagement && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    setShowAddStaff(true);
                    onClose();
                  }}
                >
                  <UserPlus className="w-5 h-5 mr-3" />
                  {t('menu.addStaff')}
                </Button>
              )}

              {features.staffManagement && hotel && hotel.staff.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-900">{t('menu.staffList')}</span>
                  </div>
                  <div className="space-y-2">
                    {hotel.staff.map((s) => (
                      <div key={s.id} className="text-xs">
                        <p className="text-gray-900">{s.name}</p>
                        <p className="text-gray-500">
                          {s.email} • {s.role === 'receptionist' ? t('header.receptionist') : t('header.housekeeping')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <Separator className="my-4" />

          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              logout();
              onClose();
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            {t('menu.logout')}
          </Button>
        </div>

      </SheetContent>
      
      {/* All Dialogs outside Sheet to avoid conflicts */}
      <Dialog open={showHotelConfig} onOpenChange={setShowHotelConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('menu.hotelConfig')}</DialogTitle>
            <DialogDescription>{t('menu.updateHotelInfo')}</DialogDescription>
          </DialogHeader>
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await updateHotelInfo(hotelName, hotelAddress, taxCode || undefined, phoneNumber || undefined, email || undefined);
                toast.success(t('menu.hotelUpdated'));
                setShowHotelConfig(false);
              } catch (error) {
                // Error already handled in AppContext
              }
            }} 
            className="space-y-4"
          >
            <div>
              <Label htmlFor="hotel-name">{t('menu.hotelName')}</Label>
              <Input
                id="hotel-name"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="Grand Hotel & Spa"
                required
              />
            </div>
            <div>
              <Label htmlFor="hotel-address">{t('menu.hotelAddress')}</Label>
              <Textarea
                id="hotel-address"
                value={hotelAddress}
                onChange={(e) => setHotelAddress(e.target.value)}
                placeholder="123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tax-code">{t('menu.taxCode')}</Label>
              <Input
                id="tax-code"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                placeholder={t('menu.taxCodePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="phone-number">{t('menu.phoneNumber')}</Label>
              <Input
                id="phone-number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('menu.phoneNumberPlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="email">{t('menu.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('menu.emailPlaceholder')}
              />
            </div>
            <Button type="submit" className="w-full">
              {t('menu.saveChanges')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('menu.addStaffTitle')}</DialogTitle>
            <DialogDescription>{t('menu.addStaffDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <Label htmlFor="staff-name">{t('menu.staffName')}</Label>
              <Input
                id="staff-name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Nguyễn Văn B"
                required
              />
            </div>
            <div>
              <Label htmlFor="staff-email">{t('menu.staffEmail')}</Label>
              <Input
                id="staff-email"
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="nhanvien@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="staff-role">{t('menu.staffRole')}</Label>
              <Select value={staffRole} onValueChange={(v: 'receptionist' | 'housekeeping') => setStaffRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receptionist">{t('header.receptionist')}</SelectItem>
                  <SelectItem value="housekeeping">{t('header.housekeeping')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              {t('menu.addStaff')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bank Account Management Dialog */}
      <BankAccountManagement 
        open={showBankAccount} 
        onClose={() => setShowBankAccount(false)} 
      />
    </Sheet>
  );
}