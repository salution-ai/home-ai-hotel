'use client'

import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Room, PaymentMethod } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { 
  Wallet,
  CreditCard,
  Building2,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  Printer,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { generateVietQRUrl } from '../utils/vietnameseBanks';

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
    const vatRate = 8; // 8% VAT
    const amountBeforeVAT = amount;
    const vatAmount = Math.round(amountBeforeVAT * (vatRate / 100));
    const totalWithVAT = amountBeforeVAT + vatAmount;
    
    return {
      amountBeforeVAT,
      vatAmount,
      totalWithVAT
    };
  };

  // Generate VietQR URL for receipt
  const getVietQRUrl = (): string | null => {
    if (!hotel?.bankAccount?.bankCode || !hotel?.bankAccount?.accountNumber) {
      return null;
    }
    
    return generateVietQRUrl(
      hotel.bankAccount.bankCode,
      hotel.bankAccount.accountNumber
    );
  };

  const handleViewReceipt = () => {
    setStep('receipt');
  };

  const completePayment = async () => {
    // Complete payment
    onComplete(paymentMethod);
    setStep('select');
    onClose();
  };

  const handlePrintReceipt = () => {
    window.print();
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
    <>
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          [data-slot="dialog-overlay"],
          [data-slot="dialog-close"],
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          
          .receipt-content,
          .receipt-content * {
            visibility: visible;
          }
          
          [data-slot="dialog-content"] {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            max-width: 80mm !important;
            width: 80mm !important;
            margin: 0 auto !important;
            padding: 10mm 5mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          
          .receipt-content {
            position: relative;
            width: 100%;
            padding: 0;
            background: white;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          
          .receipt-content h2 {
            font-size: 16px !important;
            font-weight: bold !important;
            margin: 8px 0 4px 0 !important;
            text-align: center !important;
          }
          
          .receipt-content p {
            font-size: 10px !important;
            margin: 2px 0 !important;
          }
          
          .receipt-content .text-xs {
            font-size: 9px !important;
          }
          
          .receipt-content .text-sm {
            font-size: 10px !important;
          }
          
          .receipt-content .text-lg {
            font-size: 14px !important;
          }
          
          .receipt-content .text-2xl {
            font-size: 18px !important;
          }
          
          .receipt-content .text-center {
            text-align: center !important;
          }
          
          .receipt-content .border-b {
            border-bottom: 1px solid #000 !important;
            padding-bottom: 8px !important;
            margin-bottom: 8px !important;
          }
          
          .receipt-content [class*="Card"] {
            background: transparent !important;
            border: none !important;
            padding: 4px 0 !important;
            margin: 4px 0 !important;
            box-shadow: none !important;
          }
          
          .receipt-content [class*="Card"] > div {
            padding: 0 !important;
          }
          
          .receipt-content .space-y-2 > * + * {
            margin-top: 4px !important;
          }
          
          .receipt-content .space-y-4 > * + * {
            margin-top: 8px !important;
          }
          
          .receipt-content .flex {
            display: flex !important;
          }
          
          .receipt-content .justify-between {
            justify-content: space-between !important;
          }
          
          .receipt-content .font-semibold {
            font-weight: 600 !important;
          }
          
          .receipt-content .font-bold {
            font-weight: bold !important;
          }
          
          .receipt-content hr,
          .receipt-content [class*="Separator"] {
            border: none !important;
            border-top: 1px dashed #000 !important;
            margin: 6px 0 !important;
            height: 0 !important;
          }
          
          .receipt-content .pt-2 {
            padding-top: 4px !important;
          }
          
          .receipt-content .pb-4 {
            padding-bottom: 8px !important;
          }
          
          .receipt-content .my-2 {
            margin-top: 4px !important;
            margin-bottom: 4px !important;
          }
          
          .receipt-content .my-3 {
            margin-top: 6px !important;
            margin-bottom: 6px !important;
          }
          
          .receipt-content .mt-1 {
            margin-top: 2px !important;
          }
          
          .receipt-content .mt-2 {
            margin-top: 4px !important;
          }
          
          .receipt-content .mb-3 {
            margin-bottom: 6px !important;
          }
          
          .receipt-content svg,
          .receipt-content [class*="lucide"] {
            display: none !important;
          }
          
          .receipt-content .flex.items-center.gap-2 {
            gap: 4px !important;
          }
          
          .receipt-content .text-gray-600 {
            color: #000 !important;
          }
          
          .receipt-content .text-gray-500 {
            color: #333 !important;
          }
          
          .receipt-content .text-gray-700 {
            color: #000 !important;
          }
          
          .receipt-content .text-gray-800 {
            color: #000 !important;
          }
          
          .receipt-content .text-blue-600 {
            color: #000 !important;
          }
          
          .receipt-content .bg-gray-50 {
            background: transparent !important;
          }
          
          .receipt-content .qr-container-no-print {
            display: none !important;
          }
          
          .receipt-content .qr-print-only {
            display: block !important;
            text-align: center !important;
            margin-top: 8px !important;
            margin-bottom: 8px !important;
            padding-top: 8px !important;
          }
          
          .receipt-content .qr-code-print {
            max-width: 100px !important;
            height: auto !important;
            display: inline-block !important;
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
          }
          
          .receipt-content img {
            max-width: 120px !important;
            height: auto !important;
            display: block !important;
            margin: 8px auto !important;
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
          }
        }
      `}</style>
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
                    <SelectItem value="bank-transfer" className="text-base">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {t('payment.bankTransfer')}
                      </div>
                    </SelectItem>
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
            <DialogHeader className="no-print">
              <DialogTitle className="text-xl sm:text-2xl font-bold">{t('payment.receiptTitle')}</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {t('payment.receiptDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 receipt-content">
              {/* Hotel Info */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {hotel?.name || 'Nhà nghỉ'}
                </h2>
                {hotel?.address && (
                  <p className="text-xs text-gray-600 mt-1">
                    {t('payment.address')}: {hotel.address}
                  </p>
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
                  {/* Room Charge */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-700">
                        {t('common.room')} ({t('payment.beforeVAT')})
                      </p>
                      <p className="text-xs text-gray-500">
                        {room.guest?.isHourly 
                          ? `${formatCurrency(room.hourlyRate || 0)}₫/${t('room.hours').slice(0, -1)}`
                          : `${formatCurrency(room.price)}₫/${t('room.daily').toLowerCase()}`
                        }
                      </p>
                    </div>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(amount)}₫
                    </span>
                  </div>

                  {/* VAT */}
                  {(() => {
                    const vatCalc = calculateVAT();
                    return (
                      <div className="flex justify-between items-center text-gray-600">
                        <p>VAT (8%)</p>
                        <span className="font-semibold">
                          {formatCurrency(vatCalc.vatAmount)}₫
                        </span>
                      </div>
                    );
                  })()}

                  <Separator className="my-3" />

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-gray-800">{t('room.total')}</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatCurrency(calculateVAT().totalWithVAT)}₫
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

                  {/* VietQR Code Section */}
                  {hotel?.bankAccount && getVietQRUrl() && (
                    <div className="qr-section">
                      <div className="qr-container-no-print flex flex-col items-center space-y-2 pt-4">
                        <p className="text-xs text-gray-600 text-center">
                          {t('payment.qrCodeLabel')}
                        </p>
                        <div className="bg-white p-2 rounded border border-gray-200">
                          <img
                            src={getVietQRUrl()!}
                            alt="VietQR Payment Code"
                            className="w-32 h-32 mx-auto"
                            style={{ imageRendering: 'crisp-edges' }}
                          />
                        </div>
                        {hotel.bankAccount.bankName && (
                          <p className="text-xs text-gray-500 text-center">
                            {hotel.bankAccount.bankName}
                          </p>
                        )}
                        {hotel.bankAccount.accountNumber && (
                          <p className="text-xs text-gray-500 text-center font-mono">
                            {hotel.bankAccount.accountNumber}
                          </p>
                        )}
                        {hotel.bankAccount.accountHolder && (
                          <p className="text-xs text-gray-500 text-center">
                            {hotel.bankAccount.accountHolder}
                          </p>
                        )}
                      </div>
                      {/* QR image only for print */}
                      <div className="qr-print-only hidden">
                        <img
                          src={getVietQRUrl()!}
                          alt="VietQR Payment Code"
                          className="qr-code-print"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2 sm:gap-3 pt-2 no-print">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('select')}
                  className="flex-1 text-sm sm:text-base py-4 sm:py-6"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">{t('payment.back')}</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={handlePrintReceipt}
                  className="text-sm sm:text-base py-4 sm:py-6 px-3 sm:px-4"
                >
                  <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button 
                  onClick={completePayment}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm sm:text-base py-4 sm:py-6"
                >
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  {t('payment.confirmPayment')}
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
    </>
  );
}