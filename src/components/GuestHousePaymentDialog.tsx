'use client'

import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Room, PaymentMethod } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { 
  Wallet,
  CreditCard,
  Building2,
  Smartphone,
  QrCode,
  CheckCircle2,
  ArrowLeft,
  Printer,
  Receipt,
  FileText,
  Loader2,
  Download,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { InvoicePDF } from './InvoicePDF';
import { useLanguage } from '../contexts/LanguageContext';

interface GuestHousePaymentDialogProps {
  room: Room;
  amount: number;
  open: boolean;
  onClose: () => void;
  onComplete: (paymentMethod: PaymentMethod) => void;
}

export function GuestHousePaymentDialog({ 
  room, 
  amount, 
  open, 
  onClose,
  onComplete 
}: GuestHousePaymentDialogProps) {
  const { hotel } = useApp();
  const { t } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [step, setStep] = useState<'select' | 'receipt'>('select');
  
  // Invoice states
  const [requestInvoice, setRequestInvoice] = useState(false);
  const [invoiceCustomerName, setInvoiceCustomerName] = useState('');
  const [invoiceTaxCode, setInvoiceTaxCode] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  
  // Invoice settings from localStorage
  const [invoiceSettings, setInvoiceSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Load invoice settings when opening receipt
  useEffect(() => {
    if (open && step === 'receipt' && !invoiceSettings && !loadingSettings) {
      loadInvoiceSettings();
    }
  }, [open, step]);

  const loadInvoiceSettings = () => {
    setLoadingSettings(true);
    try {
      // Load from localStorage instead of backend
      const settings = localStorage.getItem('invoiceSettings');
      if (settings) {
        setInvoiceSettings(JSON.parse(settings));
        console.log('Loaded invoice settings from localStorage:', JSON.parse(settings));
      } else {
        // Default settings
        setInvoiceSettings({
          vatRate: 8,
          vatIncluded: false,
          enabled: false
        });
      }
    } catch (error) {
      console.error('Failed to load invoice settings:', error);
      // Default settings on error
      setInvoiceSettings({
        vatRate: 8,
        vatIncluded: false,
        enabled: false
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const formatDate = (dateStr?: string) => {
    const date = dateStr ? new Date(dateStr) : new Date();
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoomAmount = () => {
    return room.guest?.totalAmount || 0;
  };

  // Calculate VAT breakdown
  const calculateVAT = () => {
    const total = amount;
    const vatRate = invoiceSettings?.vatRate || 0;
    const vatIncluded = invoiceSettings?.vatIncluded || false;

    if (vatRate === 0) {
      return {
        amountBeforeVAT: total,
        vatAmount: 0,
        totalAmount: total
      };
    }

    if (vatIncluded) {
      // Giá đã bao gồm VAT - tách VAT ra
      // IMPORTANT: totalAmount MUST equal original price
      const amountBeforeVAT = Math.round(total / (1 + vatRate / 100));
      const vatAmount = total - amountBeforeVAT; // Đảm bảo tổng = total
      return {
        amountBeforeVAT,
        vatAmount,
        totalAmount: total // GIÁ KHÔNG THAY ĐỔI
      };
    } else {
      // Giá chưa bao gồm VAT - cộng VAT vào
      const vatAmount = Math.round(total * (vatRate / 100));
      return {
        amountBeforeVAT: total,
        vatAmount,
        totalAmount: total + vatAmount
      };
    }
  };

  const handleViewReceipt = () => {
    setStep('receipt');
  };

  const completePayment = async () => {
    // If invoice requested, save to localStorage
    if (requestInvoice) {
      if (!invoiceCustomerName || !invoiceEmail) {
        toast.error(t('payment.errorInvoiceInfo'));
        return;
      }

      setCreatingInvoice(true);
      try {
        // Create invoice data and save to localStorage
        const invoiceId = `INV-${Date.now()}`;
        const invoiceData = {
          id: invoiceId,
          invoiceNumber: invoiceId,
          createdAt: new Date().toISOString(),
          customer: {
            name: invoiceCustomerName,
            taxCode: invoiceTaxCode || null,
            email: invoiceEmail,
            phone: room.guest?.phone || ''
          },
          items: [
            {
              description: `${t('payment.serviceDescription')} ${room.number} - ${room.type}`,
              quantity: room.guest?.isHourly 
                ? Math.ceil((new Date(room.guest?.checkOutDate || '').getTime() - new Date(room.guest?.checkInDate || '').getTime()) / (1000 * 60 * 60))
                : Math.ceil((new Date(room.guest?.checkOutDate || '').getTime() - new Date(room.guest?.checkInDate || '').getTime()) / (1000 * 60 * 60 * 24)),
              unitPrice: room.guest?.isHourly ? (room.hourlyRate || 0) : room.price,
              unit: room.guest?.isHourly ? t('room.hours').slice(0, -1) : t('room.daily').toLowerCase(),
              amount: getRoomAmount()
            }
          ],
          totalAmount: amount,
          paymentMethod: getPaymentMethodLabel(paymentMethod),
          roomNumber: room.number,
          checkIn: room.guest?.checkInDate,
          checkOut: room.guest?.checkOutDate,
          status: 'completed'
        };

        // Save to localStorage
        const existingInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        existingInvoices.push(invoiceData);
        localStorage.setItem('invoices', JSON.stringify(existingInvoices));

        toast.success(`✅ ${t('payment.invoiceSuccess')}: ${invoiceId}`);
        console.log('Invoice saved to localStorage:', invoiceData);
      } catch (error) {
        console.error('Failed to save invoice:', error);
        toast.error(t('payment.invoiceError'));
        setCreatingInvoice(false);
        return;
      } finally {
        setCreatingInvoice(false);
      }
    }

    // Complete payment
    onComplete(paymentMethod);
    setStep('select');
    setRequestInvoice(false);
    setInvoiceCustomerName('');
    setInvoiceTaxCode('');
    setInvoiceEmail('');
    onClose();
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const generateQRContent = () => {
    if (!hotel?.bankAccount) return '';
    
    const { bankName, accountNumber, accountHolder } = hotel.bankAccount;
    const formattedAmount = amount.toString();
    const description = `Phong ${room.number}`;
    
    // Vietnam QR Payment format
    return `https://img.vietqr.io/image/${bankName}-${accountNumber}-compact.png?amount=${formattedAmount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountHolder)}`;
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return <Wallet className="w-5 h-5" />;
      case 'bank-transfer':
        return <Building2 className="w-5 h-5" />;
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'momo':
      case 'vnpay':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Wallet className="w-5 h-5" />;
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return t('payment.cash');
      case 'bank-transfer':
        return t('payment.bankTransfer');
      case 'card':
        return t('payment.card');
      case 'momo':
        return t('payment.momo');
      case 'vnpay':
        return t('payment.vnpay');
      default:
        return method;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto mx-2 sm:mx-4 p-3 sm:p-6">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold">{t('payment.selectMethod')}</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {t('payment.selectMethodDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Quick Summary */}
              <Card className="p-3 sm:p-4 bg-blue-50 border-blue-200">
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Phòng {room.number} - {room.type}</p>
                    <p className="text-base sm:text-lg font-semibold truncate">{room.guest?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs sm:text-sm text-gray-600">{t('payment.totalAmount')}</p>
                    <p className="text-xl sm:text-3xl font-bold text-blue-600">{formatCurrency(amount)}₫</p>
                  </div>
                </div>
              </Card>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-sm sm:text-base font-semibold text-gray-700">
                  {t('payment.method')}
                </label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger className="text-sm sm:text-base py-4 sm:py-6">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(paymentMethod)}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="text-base">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        {t('payment.cash')}
                      </div>
                    </SelectItem>
                    {hotel?.bankAccount && (
                      <SelectItem value="bank-transfer" className="text-base">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {t('payment.bankTransfer')}
                        </div>
                      </SelectItem>
                    )}
                    <SelectItem value="momo" className="text-base">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        {t('payment.momo')}
                      </div>
                    </SelectItem>
                    <SelectItem value="vnpay" className="text-base">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        {t('payment.vnpay')}
                      </div>
                    </SelectItem>
                    <SelectItem value="card" className="text-base">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {t('payment.card')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1 text-sm sm:text-base py-4 sm:py-6"
                >
                  {t('delete.cancel')}
                </Button>
                <Button 
                  onClick={handleViewReceipt}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm sm:text-base py-4 sm:py-6"
                >
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  {t('payment.viewReceipt')}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold">{t('payment.receiptTitle')}</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {t('payment.receiptDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Hotel Info */}
              <div className="text-center border-b pb-4">
                {loadingSettings ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">{t('payment.loadingInfo')}</span>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {invoiceSettings?.companyName || hotel?.name || 'Nhà nghỉ'}
                    </h2>
                    {invoiceSettings?.address && (
                      <p className="text-xs text-gray-600 mt-1">
                        {t('payment.address')}: {invoiceSettings.address}
                      </p>
                    )}
                    {invoiceSettings?.phone && (
                      <p className="text-xs text-gray-600">
                        {t('payment.phoneLabel')}: {invoiceSettings.phone}
                      </p>
                    )}
                    {invoiceSettings?.taxCode && (
                      <p className="text-xs text-gray-600">
                        {t('payment.taxCode')}: {invoiceSettings.taxCode}
                      </p>
                    )}
                    {invoiceSettings?.email && (
                      <p className="text-xs text-gray-600">
                        Email: {invoiceSettings.email}
                      </p>
                    )}
                  </>
                )}
                <Separator className="my-2" />
                <p className="text-sm text-gray-600 font-semibold mt-2">{t('payment.receiptHeader')}</p>
                <p className="text-xs text-gray-500">{formatDate()}</p>
              </div>

              {/* Guest Info */}
              <Card className="p-4 bg-gray-50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('payment.guest')}:</span>
                    <span className="font-semibold">{room.guest?.name}</span>
                  </div>
                  {room.guest?.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('payment.phone')}:</span>
                      <span className="font-semibold">{room.guest.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phòng:</span>
                    <span className="font-semibold">{room.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('payment.rentalType')}:</span>
                    <span className="font-semibold">
                      {room.guest?.isHourly ? t('room.hourly') : t('room.daily')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-in:</span>
                    <span className="font-semibold">{formatDate(room.guest?.checkInDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-out:</span>
                    <span className="font-semibold">{formatDate(room.guest?.checkOutDate)}</span>
                  </div>
                </div>
              </Card>

              {/* Itemized Charges */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-800 mb-3">{t('payment.paymentDetails')}</h3>
                
                <div className="space-y-2 text-sm">
                  {(() => {
                    const vatCalc = calculateVAT();
                    const vatRate = invoiceSettings?.vatRate || 0;
                    
                    return (
                      <>
                        {/* Room Charge */}
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-700">
                              {t('common.room')} {vatRate > 0 && `(${t('payment.beforeVAT')})`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {room.guest?.isHourly 
                                ? `${formatCurrency(room.hourlyRate || 0)}₫/${t('room.hours').slice(0, -1)}`
                                : `${formatCurrency(room.price)}₫/${t('room.daily').toLowerCase()}`
                              }
                            </p>
                          </div>
                          <span className="font-semibold text-gray-800">
                            {formatCurrency(vatCalc.amountBeforeVAT)}₫
                          </span>
                        </div>

                        {/* VAT */}
                        {vatRate > 0 && (
                          <div className="flex justify-between items-center text-gray-600">
                            <p>VAT ({vatRate}%)</p>
                            <span className="font-semibold">
                              {formatCurrency(vatCalc.vatAmount)}₫
                            </span>
                          </div>
                        )}

                        <Separator className="my-3" />

                        {/* Total */}
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-lg font-bold text-gray-800">{t('room.total')}</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {formatCurrency(vatCalc.totalAmount)}₫
                          </span>
                        </div>

                        {/* Payment Method */}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm text-gray-600">{t('payment.paymentMethodLabel')}:</span>
                          <span className="font-semibold flex items-center gap-2">
                            {getPaymentMethodIcon(paymentMethod)}
                            {getPaymentMethodLabel(paymentMethod)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Card>

              {/* QR Code for Bank Transfer */}
              {paymentMethod === 'bank-transfer' && hotel?.bankAccount && (
                <Card className="p-4">
                  <div className="flex flex-col items-center space-y-3">
                    <p className="font-semibold text-gray-800">{t('payment.scanQR')}</p>
                    <div className="bg-white p-3 rounded-lg border">
                      <img
                        src={generateQRContent()}
                        alt="QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                    <div className="w-full bg-gray-50 p-3 rounded-lg space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('payment.bank')}:</span>
                        <span className="font-semibold">{hotel.bankAccount.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('payment.accountNumber')}:</span>
                        <span className="font-semibold">{hotel.bankAccount.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('payment.accountHolder')}:</span>
                        <span className="font-semibold">{hotel.bankAccount.accountHolder}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('payment.content')}:</span>
                        <span className="font-semibold">{t('common.room')} {room.number}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* ✨ NEW: Invoice Request Section */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <Checkbox 
                    id="request-invoice"
                    checked={requestInvoice}
                    onCheckedChange={(checked) => {
                      setRequestInvoice(checked as boolean);
                      if (checked) {
                        // Pre-fill with guest info
                        setInvoiceCustomerName(room.guest?.name || '');
                        setInvoiceEmail('');
                      }
                    }}
                  />
                  <Label htmlFor="request-invoice" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">{t('payment.requestInvoice')}</span>
                  </Label>
                </div>

                {requestInvoice && (
                  <div className="space-y-3 pt-2 border-t border-blue-200">
                    <div>
                      <Label htmlFor="invoice-customer-name" className="text-sm text-gray-700">
                        {t('payment.invoiceCustomerName')} *
                      </Label>
                      <Input
                        id="invoice-customer-name"
                        value={invoiceCustomerName}
                        onChange={(e) => setInvoiceCustomerName(e.target.value)}
                        placeholder={t('payment.invoiceCustomerNamePlaceholder')}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="invoice-tax-code" className="text-sm text-gray-700">
                        {t('payment.invoiceTaxCode')}
                      </Label>
                      <Input
                        id="invoice-tax-code"
                        value={invoiceTaxCode}
                        onChange={(e) => setInvoiceTaxCode(e.target.value)}
                        placeholder={t('payment.invoiceTaxCodePlaceholder')}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="invoice-email" className="text-sm text-gray-700">
                        {t('payment.invoiceEmail')} *
                      </Label>
                      <Input
                        id="invoice-email"
                        type="email"
                        value={invoiceEmail}
                        onChange={(e) => setInvoiceEmail(e.target.value)}
                        placeholder={t('payment.invoiceEmailPlaceholder')}
                        className="mt-1"
                      />
                    </div>

                    <p className="text-xs text-gray-600 flex items-start gap-1">
                      <Mail className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {t('payment.invoiceEmailInfo')}
                    </p>
                  </div>
                )}
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('select')}
                  className="flex-1 text-sm sm:text-base py-4 sm:py-6"
                  disabled={creatingInvoice}
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">{t('payment.back')}</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={handlePrintReceipt}
                  className="text-sm sm:text-base py-4 sm:py-6 px-3 sm:px-4"
                  disabled={creatingInvoice}
                >
                  <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button 
                  onClick={completePayment}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm sm:text-base py-4 sm:py-6"
                  disabled={creatingInvoice}
                >
                  {creatingInvoice ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 animate-spin" />
                      <span className="hidden sm:inline">{t('payment.processing')}</span>
                      <span className="sm:hidden">{t('payment.processing')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      {t('payment.confirmPayment')}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-gray-500 pt-2">
                {t('payment.thankYou')}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}