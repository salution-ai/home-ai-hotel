'use client'

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ExportReportButtons } from './ExportReportButtons';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Clock,
  Users,
  Home,
  Trash2
} from 'lucide-react';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { toast } from 'sonner';
import { useSubscription } from '../hooks/useSubscription';
import { PremiumDialog } from './PremiumDialog';

interface GuestHouseRevenueDialogProps {
  open: boolean;
  onClose: () => void;
}

interface RevenueData {
  date: string;
  amount: number;
  roomNumber: string;
  roomDisplayName: string; // Room number with building name: "Room 101 (Building name)"
  guestName: string;
  isHourly: boolean;
  paymentMethod: string;
}

export function GuestHouseRevenueDialog({ open, onClose }: GuestHouseRevenueDialogProps) {
  const { rooms, payments, clearPaymentsByPeriod, hotel } = useApp();
  const { t } = useLanguage();
  const { hasAdvancedReports } = useSubscription({ appSlug: 'guesthouse' });
  const [activeTab, setActiveTab] = useState<'today' | 'month' | 'year' | 'all'>('today');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'month' | 'year' | 'all' | null>(null);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [monthVisibleCount, setMonthVisibleCount] = useState(30);
  const [yearVisibleCount, setYearVisibleCount] = useState(30);
  const [allVisibleCount, setAllVisibleCount] = useState(30);

  // Helper function to get building name from roomId
  const getBuildingName = useCallback((roomId?: string): string => {
    if (!roomId || !hotel) return '';
    const room = rooms.find(r => r.id === roomId);
    if (!room) return '';
    const building = hotel.buildings.find(b => b.id === room.buildingId);
    return building ? building.name : '';
  }, [rooms, hotel]);

  // Helper function to format room display name with building
  const formatRoomDisplayName = useCallback((roomNumber: string, roomId?: string): string => {
    const buildingName = getBuildingName(roomId);
    return buildingName ? `${roomNumber}(${buildingName})` : roomNumber;
  }, [getBuildingName]);

  // Handle tab change - show premium dialog if trying to access year or all tab without premium
  const handleTabChange = (value: string) => {
    if ((value === 'year' || value === 'all') && !hasAdvancedReports) {
      setShowPremiumDialog(true);
      toast.error(t('export.premiumRequired') || 'This feature requires Premium subscription');
      return; // Don't allow switching to premium tabs if not subscribed
    }
    setActiveTab(value as 'today' | 'month' | 'year' | 'all');
    // Reset visible counts when switching tabs
    if (value !== 'month') {
      setMonthVisibleCount(30);
    }
    if (value !== 'year') {
      setYearVisibleCount(30);
    }
    if (value !== 'all') {
      setAllVisibleCount(30);
    }
  };

  const handleLoadMoreMonth = () => {
    setMonthVisibleCount(prev => prev + 30);
  };

  const handleLoadMoreYear = () => {
    setYearVisibleCount(prev => prev + 30);
  };

  const handleLoadMoreAll = () => {
    setAllVisibleCount(prev => prev + 30);
  };

  const handleClearReports = async () => {
    if (!selectedPeriod) return;
    
    try {
      await clearPaymentsByPeriod(selectedPeriod);
      setClearDialogOpen(false);
      setSelectedPeriod(null);
    } catch (error) {
      // Error already handled in AppContext
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  // Collect revenue data - only from completed payments (checked-out)
  // Revenue is only calculated when guests check out, not when they check in
  const revenueHistory = useMemo(() => {
    const history: RevenueData[] = [];
    
    // Only add completed payments (actual revenue from checked-out guests)
    payments.forEach(payment => {
      const roomDisplayName = formatRoomDisplayName(payment.roomNumber, payment.roomId);
      history.push({
        date: payment.timestamp || payment.checkInDate,
        amount: payment.total,
        roomNumber: payment.roomNumber,
        roomDisplayName: roomDisplayName,
        guestName: payment.guestName,
        isHourly: payment.isHourly,
        paymentMethod: payment.paymentMethod
      });
    });

    // Sort by date descending
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, formatRoomDisplayName]);

  // Today's revenue
  const todayRevenue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return revenueHistory.filter(r => r.date.startsWith(today));
  }, [revenueHistory]);

  const todayTotal = todayRevenue.reduce((sum, r) => sum + r.amount, 0);
  const todayHourly = todayRevenue.filter(r => r.isHourly).reduce((sum, r) => sum + r.amount, 0);
  const todayDaily = todayRevenue.filter(r => !r.isHourly).reduce((sum, r) => sum + r.amount, 0);

  // This month's revenue
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthRevenue = useMemo(() => {
    return revenueHistory.filter(r => r.date.startsWith(currentMonth));
  }, [revenueHistory, currentMonth]);

  // Reset visible count when month changes
  useEffect(() => {
    setMonthVisibleCount(30);
  }, [currentMonth]);

  // Visible month revenue (lazy loading - show 30 at a time)
  // Free users are limited to 30 payments only, premium users can load more
  const visibleMonthRevenue = useMemo(() => {
    if (!hasAdvancedReports) {
      // Free users: only show latest 30 payments
      return monthRevenue.slice(0, 30);
    }
    // Premium users: show up to monthVisibleCount
    return monthRevenue.slice(0, monthVisibleCount);
  }, [monthRevenue, monthVisibleCount, hasAdvancedReports]);

  const hasMoreMonthPayments = hasAdvancedReports && monthRevenue.length > monthVisibleCount;
  const isFreeUserLimited = !hasAdvancedReports && monthRevenue.length > 30;

  const monthTotal = monthRevenue.reduce((sum, r) => sum + r.amount, 0);
  const monthHourly = monthRevenue.filter(r => r.isHourly).reduce((sum, r) => sum + r.amount, 0);
  const monthDaily = monthRevenue.filter(r => !r.isHourly).reduce((sum, r) => sum + r.amount, 0);

  // This year's revenue
  const currentYear = new Date().getFullYear().toString();
  const yearRevenue = useMemo(() => {
    return revenueHistory.filter(r => r.date.startsWith(currentYear));
  }, [revenueHistory, currentYear]);

  // Reset visible count when year changes
  useEffect(() => {
    setYearVisibleCount(30);
  }, [currentYear]);

  // Visible year revenue (lazy loading - show 30 at a time)
  // Free users are limited to 30 payments only, premium users can load more
  const visibleYearRevenue = useMemo(() => {
    if (!hasAdvancedReports) {
      // Free users: only show latest 30 payments
      return yearRevenue.slice(0, 30);
    }
    // Premium users: show up to yearVisibleCount
    return yearRevenue.slice(0, yearVisibleCount);
  }, [yearRevenue, yearVisibleCount, hasAdvancedReports]);

  const hasMoreYearPayments = hasAdvancedReports && yearRevenue.length > yearVisibleCount;
  const isFreeUserLimitedYear = !hasAdvancedReports && yearRevenue.length > 30;

  const yearTotal = yearRevenue.reduce((sum, r) => sum + r.amount, 0);
  const yearHourly = yearRevenue.filter(r => r.isHourly).reduce((sum, r) => sum + r.amount, 0);
  const yearDaily = yearRevenue.filter(r => !r.isHourly).reduce((sum, r) => sum + r.amount, 0);

  // All revenue (all payments regardless of date)
  const allRevenue = useMemo(() => {
    return revenueHistory;
  }, [revenueHistory]);

  // Visible all revenue (lazy loading - show 30 at a time)
  // Free users are limited to 30 payments only, premium users can load more
  const visibleAllRevenue = useMemo(() => {
    if (!hasAdvancedReports) {
      // Free users: only show latest 30 payments
      return allRevenue.slice(0, 30);
    }
    // Premium users: show up to allVisibleCount
    return allRevenue.slice(0, allVisibleCount);
  }, [allRevenue, allVisibleCount, hasAdvancedReports]);

  const hasMoreAllPayments = hasAdvancedReports && allRevenue.length > allVisibleCount;
  const isFreeUserLimitedAll = !hasAdvancedReports && allRevenue.length > 30;

  const allTotal = allRevenue.reduce((sum, r) => sum + r.amount, 0);
  const allHourly = allRevenue.filter(r => r.isHourly).reduce((sum, r) => sum + r.amount, 0);
  const allDaily = allRevenue.filter(r => !r.isHourly).reduce((sum, r) => sum + r.amount, 0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${t('revenue.monthFormat')} ${month}/${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-3xl font-bold flex items-center gap-2">
                <DollarSign className="w-8 h-8 text-green-600" />
                {t('revenue.title')}
              </DialogTitle>
              <DialogDescription>
                {t('revenue.description')}
              </DialogDescription>
            </div>
            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('revenue.clearReports')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('revenue.clearReports')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('revenue.clearReportsDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-4">
                  <Button
                    variant={selectedPeriod === 'today' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setSelectedPeriod('today')}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {t('revenue.today')}
                  </Button>
                  <Button
                    variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setSelectedPeriod('month')}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('revenue.month')}
                  </Button>
                  {hasAdvancedReports && (
                    <>
                      <Button
                        variant={selectedPeriod === 'year' ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => setSelectedPeriod('year')}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        {t('revenue.year')}
                      </Button>
                      <Button
                        variant={selectedPeriod === 'all' ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => setSelectedPeriod('all')}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        {t('revenue.all')}
                      </Button>
                    </>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedPeriod(null)}>{t('action.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearReports}
                    disabled={!selectedPeriod}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {t('revenue.clear')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today" className="text-base">
              {t('revenue.today')}
            </TabsTrigger>
            <TabsTrigger value="month" className="text-base">
              {t('revenue.month')}
            </TabsTrigger>
            <TabsTrigger 
              value="year" 
              className={`text-base ${!hasAdvancedReports ? 'opacity-50' : ''}`}
            >
              {t('revenue.year')}
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className={`text-base ${!hasAdvancedReports ? 'opacity-50' : ''}`}
            >
              {t('revenue.all') || 'All'}
            </TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today" className="space-y-4">
            {/* Export Buttons */}
            <ExportReportButtons
              data={todayRevenue.map(r => ({
                date: r.date,
                roomNumber: r.roomDisplayName, // Use display name with building
                guestName: r.guestName,
                amount: r.amount,
                type: r.isHourly ? 'Gio' : 'Ngay'
              }))}
              reportType="guesthouse"
              period="Hom nay"
              summary={{ total: todayTotal }}
            />

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.total')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(todayTotal)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {todayRevenue.length} {t('revenue.transactions')}
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.hourly')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(todayHourly)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {todayRevenue.filter(r => r.isHourly).length} {t('revenue.transactions')}
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.daily')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(todayDaily)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {todayRevenue.filter(r => !r.isHourly).length} {t('revenue.transactions')}
                </p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold text-lg mb-3">{t('revenue.todayDetails')}</h3>
              {todayRevenue.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('revenue.noRevenueToday')}</p>
              ) : (
                <div className="space-y-2">
                  {todayRevenue.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Home className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{t('common.room')} {item.roomDisplayName}</p>
                          <p className="text-sm text-gray-600">{item.guestName}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(item.amount)}₫
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {item.isHourly ? t('room.hourly') : t('room.daily')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Month Tab */}
          <TabsContent value="month" className="space-y-4">
            {/* Export Buttons */}
            <ExportReportButtons
              data={monthRevenue.map(r => ({
                date: r.date,
                roomNumber: r.roomDisplayName, // Use display name with building
                guestName: r.guestName,
                amount: r.amount,
                type: r.isHourly ? 'Gio' : 'Ngay'
              }))}
              reportType="guesthouse"
              period={formatMonth(currentMonth)}
              summary={{ total: monthTotal }}
            />

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.totalMonth')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(monthTotal)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {monthRevenue.length} {t('revenue.transactions')}
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.hourly')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(monthHourly)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {monthRevenue.filter(r => r.isHourly).length} {t('revenue.transactions')}
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.daily')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(monthDaily)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {monthRevenue.filter(r => !r.isHourly).length} {t('revenue.transactions')}
                </p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold text-lg mb-3">
                {t('revenue.monthDetails')} {formatMonth(currentMonth)}
              </h3>
              {monthRevenue.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('revenue.noRevenueMonth')}</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {visibleMonthRevenue.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Home className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{t('common.room')} {item.roomDisplayName}</p>
                            <p className="text-sm text-gray-600">{item.guestName}</p>
                            <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(item.amount)}₫
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {item.isHourly ? t('room.hourly') : t('room.daily')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMoreMonthPayments && (
                    <div className="mt-4 flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={handleLoadMoreMonth}
                        className="w-full"
                      >
                        {t('revenue.loadMore')} ({monthRevenue.length - monthVisibleCount} remaining)
                      </Button>
                    </div>
                  )}
                  {isFreeUserLimited && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-center text-sm text-yellow-800 mb-2">
                        {t('revenue.freeUserLimit')} {monthRevenue.length} {t('revenue.transactions')}
                      </p>
                      <Button 
                        variant="default" 
                        onClick={() => setShowPremiumDialog(true)}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        {t('revenue.upgradeToViewAll') || 'Upgrade'}
                      </Button>
                    </div>
                  )}
                  {!hasMoreMonthPayments && !isFreeUserLimited && monthRevenue.length > 30 && (
                    <p className="text-center text-sm text-gray-500 mt-4">
                        {t('revenue.allLoaded')} {monthRevenue.length} {t('revenue.transactions')}
                    </p>
                  )}
                </>
              )}
            </Card>
          </TabsContent>

          {/* Year Tab */}
          <TabsContent value="year" className="space-y-4">
            {!hasAdvancedReports ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500 text-lg">{t('revenue.noRevenueYear')}</p>
              </Card>
            ) : (
              <>
            {/* Export Buttons */}
            <ExportReportButtons
              data={yearRevenue.map(r => ({
                date: r.date,
                roomNumber: r.roomDisplayName, // Use display name with building
                guestName: r.guestName,
                amount: r.amount,
                type: r.isHourly ? 'Gio' : 'Ngay'
              }))}
              reportType="guesthouse"
              period={`Nam ${currentYear}`}
              summary={{ total: yearTotal }}
            />

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.totalYear')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(yearTotal)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {yearRevenue.length} {t('revenue.transactions')}
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.hourly')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(yearHourly)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {yearRevenue.filter(r => r.isHourly).length} {t('revenue.transactions')}
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.daily')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(yearDaily)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {yearRevenue.filter(r => !r.isHourly).length} {t('revenue.transactions')}
                </p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold text-lg mb-3">
                {t('revenue.monthDetails')} {currentYear}
              </h3>
              {yearRevenue.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('revenue.noRevenueYear')}</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {visibleYearRevenue.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Home className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{t('common.room')} {item.roomDisplayName}</p>
                            <p className="text-sm text-gray-600">{item.guestName}</p>
                            <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(item.amount)}₫
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {item.isHourly ? t('room.hourly') : t('room.daily')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMoreYearPayments && (
                    <div className="mt-4 flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={handleLoadMoreYear}
                        className="w-full"
                      >
                        {t('revenue.loadMore')} ({yearRevenue.length - yearVisibleCount} remaining)
                      </Button>
                    </div>
                  )}
                  {isFreeUserLimitedYear && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-center text-sm text-yellow-800 mb-2">
                        {t('revenue.freeUserLimit')} {yearRevenue.length} {t('revenue.transactions')}
                      </p>
                      <Button 
                        variant="default" 
                        onClick={() => setShowPremiumDialog(true)}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        {t('revenue.upgradeToViewAll') || 'Upgrade'}
                      </Button>
                    </div>
                  )}
                  {!hasMoreYearPayments && !isFreeUserLimitedYear && yearRevenue.length > 30 && (
                    <p className="text-center text-sm text-gray-500 mt-4">
                        {t('revenue.allLoaded')} {yearRevenue.length} {t('revenue.transactions')}
                    </p>
                  )}
                </>
              )}
            </Card>
              </>
            )}
          </TabsContent>

          {/* All Tab */}
          <TabsContent value="all" className="space-y-4">
            {!hasAdvancedReports ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500 text-lg">{t('revenue.noRevenueYear')}</p>
              </Card>
            ) : (
              <>
            {/* Export Buttons */}
            <ExportReportButtons
              data={allRevenue.map(r => ({
                date: r.date,
                roomNumber: r.roomDisplayName, // Use display name with building
                guestName: r.guestName,
                amount: r.amount,
                type: r.isHourly ? 'Gio' : 'Ngay'
              }))}
              reportType="guesthouse"
              period={t('revenue.all') || 'All'}
              summary={{ total: allTotal }}
            />

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.total')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(allTotal)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {allRevenue.length} {t('revenue.transactions')}
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.hourly')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(allHourly)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {allRevenue.filter(r => r.isHourly).length} {t('revenue.transactions')}
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                <p className="text-sm text-gray-600 mb-1">{t('revenue.daily')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(allDaily)}₫
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {allRevenue.filter(r => !r.isHourly).length} {t('revenue.transactions')}
                </p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold text-lg mb-3">
                {t('revenue.monthDetails')} {t('revenue.all') || 'All'}
              </h3>
              {allRevenue.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('revenue.noRevenueYear')}</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {visibleAllRevenue.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Home className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{t('common.room')} {item.roomDisplayName}</p>
                            <p className="text-sm text-gray-600">{item.guestName}</p>
                            <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(item.amount)}₫
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {item.isHourly ? t('room.hourly') : t('room.daily')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMoreAllPayments && (
                    <div className="mt-4 flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={handleLoadMoreAll}
                        className="w-full"
                      >
                        {t('revenue.loadMore')} ({allRevenue.length - allVisibleCount} remaining)
                      </Button>
                    </div>
                  )}
                  {isFreeUserLimitedAll && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-center text-sm text-yellow-800 mb-2">
                        {t('revenue.freeUserLimit')} {allRevenue.length} {t('revenue.transactions')}
                      </p>
                      <Button 
                        variant="default" 
                        onClick={() => setShowPremiumDialog(true)}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        {t('revenue.upgradeToViewAll') || 'Upgrade'}
                      </Button>
                    </div>
                  )}
                  {!hasMoreAllPayments && !isFreeUserLimitedAll && allRevenue.length > 30 && (
                    <p className="text-center text-sm text-gray-500 mt-4">
                        {t('revenue.allLoaded')} {allRevenue.length} {t('revenue.transactions')}
                    </p>
                  )}
                </>
              )}
            </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
      <PremiumDialog 
        open={showPremiumDialog} 
        onOpenChange={setShowPremiumDialog}
        onUpgradeSuccess={() => setShowPremiumDialog(false)}
      />
    </Dialog>
  );
}
