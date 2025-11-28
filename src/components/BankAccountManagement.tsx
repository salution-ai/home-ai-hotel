'use client'

import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Building2, CreditCard, User, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';
import { VIETNAMESE_BANKS, getBankByCode, getBankByShortName } from '../utils/vietnameseBanks';

interface BankAccountManagementProps {
  open: boolean;
  onClose: () => void;
}

export function BankAccountManagement({ open, onClose }: BankAccountManagementProps) {
  const { hotel, updateBankAccount } = useApp();
  const { t } = useLanguage();
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  useEffect(() => {
    if (hotel?.bankAccount) {
      // If bankCode exists, use it; otherwise try to find by bankName (backward compatibility)
      if (hotel.bankAccount.bankCode) {
        setBankCode(hotel.bankAccount.bankCode);
      } else if (hotel.bankAccount.bankName) {
        // Backward compatibility: try to find bank by short name
        const bank = getBankByShortName(hotel.bankAccount.bankName);
        setBankCode(bank?.code || '');
      } else {
        setBankCode('');
      }
      setAccountNumber(hotel.bankAccount.accountNumber || '');
      setAccountHolder(hotel.bankAccount.accountHolder || '');
    } else {
      setBankCode('');
      setAccountNumber('');
      setAccountHolder('');
    }
  }, [hotel, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedBank = getBankByCode(bankCode);
    if (!selectedBank) {
      toast.error(t('bank.invalidBankSelection') || 'Please select a valid bank');
      return;
    }

    try {
      await updateBankAccount({
        bankName: selectedBank.shortName,
        bankCode: selectedBank.code,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim().toUpperCase(),
      });

      toast.success(t('bank.updateSuccess'));
      onClose();
    } catch (error) {
      // Error already handled in AppContext
    }
  };

  const selectedBank = getBankByCode(bankCode);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <DialogTitle className="text-xl font-bold">{t('bank.title')}</DialogTitle>
          </div>
          <DialogDescription className="text-sm mt-2">
            {t('bank.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Bank Selection */}
          <div className="space-y-2">
            <Label htmlFor="bank-select" className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              {t('bank.bankNameLabel')}
            </Label>
            <Select value={bankCode} onValueChange={setBankCode} required>
              <SelectTrigger id="bank-select">
                <SelectValue placeholder={t('bank.bankNamePlaceholder')} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {VIETNAMESE_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBank && (
              <p className="text-xs text-gray-500">
                {selectedBank.fullName}
              </p>
            )}
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="account-number" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-500" />
              {t('bank.accountNumberLabel')}
            </Label>
            <Input
              id="account-number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={t('bank.accountNumberPlaceholder')}
              required
            />
          </div>

          {/* Account Holder */}
          <div className="space-y-2">
            <Label htmlFor="account-holder" className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              {t('bank.accountHolderLabel')}
            </Label>
            <Input
              id="account-holder"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
              placeholder={t('bank.accountHolderPlaceholder')}
              required
            />
            <p className="text-xs text-gray-500">{t('bank.accountHolderHint')}</p>
          </div>

          {/* Notes */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-blue-900">{t('bank.note')}</p>
                <ul className="space-y-1 text-blue-800 list-disc list-inside">
                  <li>{t('bank.note1')}</li>
                  <li>{t('bank.note2')}</li>
                  <li>{t('bank.note3')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t('bank.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {t('bank.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

