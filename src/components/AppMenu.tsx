'use client'

import { LogOut, UserPlus, Users, Building2, Settings, Trash2, CreditCard, Globe, HelpCircle, DollarSign, PanelLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useBusinessModel } from '../hooks/useBusinessModel';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../locales';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { BankAccountManagement } from './BankAccountManagement';
import { SubscriptionStatus } from './SubscriptionStatus';
import { GuestHouseRevenueDialog } from './GuestHouseRevenueDialog';
import { HelpDialog } from './HelpDialog';
import { useMenu } from '../contexts/MenuContext';

interface AppMenuProps {
  open?: boolean;
  onClose?: () => void;
}

export function AppMenu({ open, onClose }: AppMenuProps) {
  const { user, hotel, logout, addStaff, updateHotelInfo, updateBankAccount } = useApp();
  const { features, isBoardingHouse, isGuestHouse } = useBusinessModel();
  const { language, setLanguage, t } = useLanguage();
  const { isCollapsed, setIsCollapsed } = useMenu();
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showHotelConfig, setShowHotelConfig] = useState(false);
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [showRevenueDialog, setShowRevenueDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
    <div className={`fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 flex flex-col z-40 shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64 sm:w-80'}`}>
      <div className={`p-4 border-b border-gray-200 ${isCollapsed ? 'px-2' : ''} relative`}>
        {!isCollapsed && (
          <>
            <h2 className="font-semibold text-lg pr-8">{hotel?.name}</h2>
            <p className="text-sm text-gray-500">{t('menu.main')}</p>
          </>
        )}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-2">
            {/* Toggle Collapse Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={t('menu.expand')}
            >
              <PanelLeft className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{hotel?.name?.[0]?.toUpperCase() || 'H'}</span>
            </div>
          </div>
        )}
        {!isCollapsed && (
          /* Toggle Collapse Button */
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-2"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={t('menu.collapse')}
          >
            <PanelLeft className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto space-y-2 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          {/* Subscription Status */}
          {!isCollapsed && <SubscriptionStatus appSlug="guesthouse" className="mb-4" />}

          {!isCollapsed && <Separator className="my-4" />}

          {/* Revenue Report */}
          <Button 
            variant="ghost" 
            className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            onClick={() => {
              setShowRevenueDialog(true);
              onClose?.();
            }}
            title={isCollapsed ? t('revenue.title') : undefined}
          >
            <DollarSign className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && t('revenue.title')}
          </Button>

          {/* Admin only */}
          {isAdmin && (
            <>
              <Button 
                variant="ghost" 
                className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
                onClick={() => {
                  setShowHotelConfig(true);
                  onClose?.();
                }}
                title={isCollapsed ? (isBoardingHouse ? t('menu.configBoardingHouse') : isGuestHouse ? t('menu.configGuestHouse') : t('menu.configHotel')) : undefined}
              >
                <Building2 className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && (isBoardingHouse ? t('menu.configBoardingHouse') : isGuestHouse ? t('menu.configGuestHouse') : t('menu.configHotel'))}
              </Button>

              <Button 
                variant="ghost" 
                className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
                onClick={() => {
                  setShowBankAccount(true);
                  onClose?.();
                }}
                title={isCollapsed ? t('menu.bankAccount') : undefined}
              >
                <CreditCard className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && t('menu.bankAccount')}
              </Button>

              {/* Staff Management - Only for hotels with staff */}
              {features.staffManagement && (
                <Button 
                  variant="ghost" 
                  className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
                  onClick={() => {
                    setShowAddStaff(true);
                    onClose?.();
                  }}
                  title={isCollapsed ? t('menu.addStaff') : undefined}
                >
                  <UserPlus className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && t('menu.addStaff')}
                </Button>
              )}

              {!isCollapsed && features.staffManagement && hotel && hotel.staff.length > 0 && (
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

          {!isCollapsed && <Separator className="my-4" />}

          {/* Language Selector */}
          {isCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-center px-0" title={t('header.language')}>
                  <Globe className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {Object.values(languages).map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                    {language === lang.code && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <Globe className="w-5 h-5 mr-3" />
                  {t('header.language')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {Object.values(languages).map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                    {language === lang.code && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Guide */}
          <Button 
            variant="ghost" 
            className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            onClick={() => {
              setShowHelpDialog(true);
              onClose?.();
            }}
            title={isCollapsed ? t('dashboard.helpTitle') : undefined}
          >
            <HelpCircle className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && t('dashboard.helpTitle')}
          </Button>

          {!isCollapsed && <Separator className="my-4" />}

          <Button
            variant="ghost"
            className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'} text-red-600 hover:text-red-700 hover:bg-red-50`}
            onClick={() => {
              setShowLogoutConfirm(true);
            }}
            title={isCollapsed ? t('menu.logout') : undefined}
          >
            <LogOut className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && t('menu.logout')}
          </Button>
        </div>

      {/* All Dialogs */}
      <Dialog open={showHotelConfig} onOpenChange={setShowHotelConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('menu.hotelConfig')}</DialogTitle>
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

      {/* Revenue Dialog */}
      <GuestHouseRevenueDialog
        open={showRevenueDialog}
        onClose={() => setShowRevenueDialog(false)}
      />

      {/* Help Dialog */}
      <HelpDialog
        open={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
        businessModel="guesthouse"
      />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('menu.logoutConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('menu.logoutConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('menu.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                logout();
                onClose?.();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('menu.logoutConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}