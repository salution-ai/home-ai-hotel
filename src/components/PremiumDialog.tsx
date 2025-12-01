'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import { Star, Check } from 'lucide-react';
import { subscriptionApi } from '../utils/api/subscriptions';

interface PremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgradeSuccess?: () => void;
}

export function PremiumDialog({ open, onOpenChange, onUpgradeSuccess }: PremiumDialogProps) {
  const { t } = useLanguage();

  const pricingPlans = [
    { period: 'month', days: 30, price: 0, label: t('premium.month') || 'Month' },
    { period: 'year', days: 365, price: 0, label: t('premium.year') || 'Year' },
  ];

  const features = [
    t('premium.feature1') || 'Unlimited rooms',
    t('premium.feature2') || 'Advanced reporting',
    t('premium.feature3') || 'Priority support',
    t('premium.feature4') || 'Export to Excel/PDF',
    t('premium.feature5') || 'Receipt with bank QR code',
  ];

  const handlePurchase = async (days: number, period: string) => {
    try {
      const response = await subscriptionApi.create('guesthouse', 'premium', days);
      
      if (response.extended) {
        toast.success(t('premium.extendSuccess') || `Premium subscription extended by ${period}!`);
      } else {
        toast.success(t('premium.activateSuccess') || 'Premium subscription activated!');
      }
      
      onUpgradeSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upgrade to premium';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-lg">
              <Star className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-2xl">
              {t('premium.title') || 'Upgrade to Premium'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {t('premium.subtitle') || 'Unlock all premium features'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Features List */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-semibold mb-3 text-gray-900">
              {t('premium.featuresTitle') || 'Premium Features:'}
            </h3>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing Plans */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">
              {t('premium.choosePlan') || 'Choose a plan:'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.period}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-yellow-400 transition-all hover:shadow-lg"
                >
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {plan.price.toLocaleString('vi-VN')} VND
                    </div>
                    <div className="text-sm text-gray-600">
                      {plan.label}
                    </div>
                  </div>
                  <Button
                    onClick={() => handlePurchase(plan.days, plan.label)}
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-semibold"
                  >
                    {t('premium.select') || 'Select'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

