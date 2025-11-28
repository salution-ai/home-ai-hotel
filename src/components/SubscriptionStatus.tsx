'use client'

import { useState, useEffect } from 'react';
import { subscriptionApi, Subscription } from '../utils/api/subscriptions';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Crown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { PremiumDialog } from './PremiumDialog';

interface SubscriptionStatusProps {
  appSlug?: string;
  className?: string;
}

export function SubscriptionStatus({ appSlug = 'guesthouse', className }: SubscriptionStatusProps) {
  const { t } = useLanguage();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);

  const loadSubscription = async () => {
    try {
      const sub = await subscriptionApi.getByApp(appSlug);
      setSubscription(sub);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [appSlug]);

  const handleUpgradeSuccess = () => {
    loadSubscription();
  };

  if (loading) {
    return (
      <Card className={`p-3 bg-gray-50 border-gray-200 ${className || ''}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Loading subscription...</span>
        </div>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <>
        <Card className={`p-3 bg-yellow-50 border-yellow-200 ${className || ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">Free Plan - Limited to 10 rooms</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowPremiumDialog(true)}>
              Upgrade
            </Button>
          </div>
        </Card>
        <PremiumDialog
          open={showPremiumDialog}
          onOpenChange={setShowPremiumDialog}
          onUpgradeSuccess={handleUpgradeSuccess}
        />
      </>
    );
  }

  if (subscription.status !== 'active') {
    return (
      <>
        <Card className={`p-3 bg-red-50 border-red-200 ${className || ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800">
                Subscription {subscription.status}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowPremiumDialog(true)}>
              Renew
            </Button>
          </div>
        </Card>
        <PremiumDialog
          open={showPremiumDialog}
          onOpenChange={setShowPremiumDialog}
          onUpgradeSuccess={handleUpgradeSuccess}
        />
      </>
    );
  }

  const isPremium = subscription.planSlug === 'premium';
  const maxRooms = subscription.features.max_rooms as number | undefined;

  return (
    <>
      <Card className={`p-3 ${isPremium ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200' : 'bg-blue-50 border-blue-200'} ${className || ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPremium ? (
              <Crown className="w-4 h-4 text-purple-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {subscription.planName}
                </span>
                {isPremium && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    Premium
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {isPremium && subscription.remainingDays > 0 && (
                  <span className="text-xs text-gray-700">
                    {(t('premium.remainingDays' as any) || '{days} days remaining').replace('{days}', subscription.remainingDays.toString())}
                  </span>
                )}
                {maxRooms !== undefined && maxRooms !== -1 && !isPremium && (
                  <span className="text-xs text-gray-600">
                    {maxRooms} rooms limit
                  </span>
                )}
                {subscription.remainingDays > 0 && subscription.remainingDays <= 7 && !isPremium && (
                  <span className="text-xs text-yellow-600 ml-2">
                    Expires in {subscription.remainingDays} days
                  </span>
                )}
              </div>
            </div>
          </div>
          {isPremium ? (
            <Button size="sm" variant="outline" onClick={() => setShowPremiumDialog(true)}>
              {(t('premium.extend' as any) || 'Extend')}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowPremiumDialog(true)}>
              Upgrade
            </Button>
          )}
        </div>
      </Card>
      <PremiumDialog
        open={showPremiumDialog}
        onOpenChange={setShowPremiumDialog}
        onUpgradeSuccess={handleUpgradeSuccess}
      />
    </>
  );
}

