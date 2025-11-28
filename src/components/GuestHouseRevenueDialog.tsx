'use client'

import { useState, useMemo, useEffect } from 'react';
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

interface GuestHouseRevenueDialogProps {
  open: boolean;
  onClose: () => void;
}

interface RevenueData {
  date: string;
  amount: number;
  roomNumber: string;
  guestName: string;
  isHourly: boolean;
  paymentMethod: string;
}

export function GuestHouseRevenueDialog({ open, onClose }: GuestHouseRevenueDialogProps) {
  const { rooms, payments, clearPaymentsByPeriod } = useApp();
  const { t } = useLanguage();
  const { hasAdvancedReports } = useSubscription({ appSlug: 'guesthouse' });
  const [activeTab, setActiveTab] = useState<'today' | 'month' | 'year'>('today');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'month' | 'year' | null>(null);

  // Reset to 'today' if advanced reports is disabled and current tab is 'year'
  useEffect(() => {
    if (!hasAdvancedReports && activeTab === 'year') {
      setActiveTab('today');
    }
  }, [hasAdvancedReports, activeTab]);

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
      history.push({
        date: payment.timestamp || payment.checkInDate,
        amount: payment.total,
        roomNumber: payment.roomNumber,
        guestName: payment.guestName,
        isHourly: payment.roomCharge > 0 && payment.checkInDate !== payment.checkOutDate ? false : true, // Simplified check
        paymentMethod: payment.paymentMethod
      });
    });

    // Sort by date descending
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments]);

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

  const monthTotal = monthRevenue.reduce((sum, r) => sum + r.amount, 0);
  const monthHourly = monthRevenue.filter(r => r.isHourly).reduce((sum, r) => sum + r.amount, 0);
  const monthDaily = monthRevenue.filter(r => !r.isHourly).reduce((sum, r) => sum + r.amount, 0);

  // This year's revenue
  const currentYear = new Date().getFullYear().toString();
  const yearRevenue = useMemo(() => {
    return revenueHistory.filter(r => r.date.startsWith(currentYear));
  }, [revenueHistory, currentYear]);

  const yearTotal = yearRevenue.reduce((sum, r) => sum + r.amount, 0);
  const yearHourly = yearRevenue.filter(r => r.isHourly).reduce((sum, r) => sum + r.amount, 0);
  const yearDaily = yearRevenue.filter(r => !r.isHourly).reduce((sum, r) => sum + r.amount, 0);

  // Group by month for year view
  const monthlyBreakdown = useMemo(() => {
    const breakdown: { [month: string]: { total: number; count: number } } = {};
    
    yearRevenue.forEach(r => {
      const month = r.date.slice(0, 7); // YYYY-MM
      if (!breakdown[month]) {
        breakdown[month] = { total: 0, count: 0 };
      }
      breakdown[month].total += r.amount;
      breakdown[month].count += 1;
    });

    return Object.entries(breakdown)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({ month, ...data }));
  }, [yearRevenue]);

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
                  Clear Reports
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Reports</AlertDialogTitle>
                  <AlertDialogDescription>
                    Select the period you want to clear:
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-4">
                  <Button
                    variant={selectedPeriod === 'today' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setSelectedPeriod('today')}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Today
                  </Button>
                  <Button
                    variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setSelectedPeriod('month')}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    This Month
                  </Button>
                  {hasAdvancedReports && (
                    <Button
                      variant={selectedPeriod === 'year' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setSelectedPeriod('year')}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      This Year
                    </Button>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedPeriod(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearReports}
                    disabled={!selectedPeriod}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className={`grid w-full ${hasAdvancedReports ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="today" className="text-base">
              {t('revenue.today')}
            </TabsTrigger>
            <TabsTrigger value="month" className="text-base">
              {t('revenue.month')}
            </TabsTrigger>
            {hasAdvancedReports && (
              <TabsTrigger value="year" className="text-base">
                {t('revenue.year')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today" className="space-y-4">
            {/* Export Buttons */}
            <ExportReportButtons
              data={todayRevenue.map(r => ({
                date: r.date,
                roomNumber: r.roomNumber,
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
                          <p className="font-semibold">{t('common.room')} {item.roomNumber}</p>
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
                roomNumber: r.roomNumber,
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
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {monthRevenue.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Home className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{t('common.room')} {item.roomNumber}</p>
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

          {/* Year Tab - Only shown if advanced_reports is enabled */}
          {hasAdvancedReports && (
            <TabsContent value="year" className="space-y-4">
            {/* Export Buttons */}
            <ExportReportButtons
              data={yearRevenue.map(r => ({
                date: r.date,
                roomNumber: r.roomNumber,
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
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t('revenue.monthlyRevenue')} ({currentYear})
              </h3>
              {monthlyBreakdown.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('revenue.noRevenueYear')}</p>
              ) : (
                <div className="space-y-2">
                  {monthlyBreakdown.map((item) => (
                    <div key={item.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold">{formatMonth(item.month)}</p>
                        <p className="text-sm text-gray-600">{item.count} {t('revenue.checkins')}</p>
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(item.total)}₫
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
