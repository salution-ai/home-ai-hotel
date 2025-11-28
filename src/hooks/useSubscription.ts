import { useState, useEffect } from 'react';
import { subscriptionApi, Subscription } from '../utils/api/subscriptions';

interface UseSubscriptionOptions {
  appSlug?: string;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  hasFeature: (feature: string) => boolean;
  getFeature: <T = unknown>(feature: string) => T | undefined;
  maxRooms: number; // -1 means unlimited, otherwise defaults to 10 for free plan
  maxBuildings: number; // -1 means unlimited, otherwise defaults to 1 for free plan
  canExportReports: boolean;
  hasAdvancedReports: boolean;
}

export function useSubscription({ appSlug = 'guesthouse' }: UseSubscriptionOptions = {}): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSubscription = async () => {
      try {
        const sub = await subscriptionApi.getByApp(appSlug);
        if (!cancelled) {
          setSubscription(sub);
        }
      } catch (error) {
        console.error('Failed to load subscription:', error);
        if (!cancelled) {
          setSubscription(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSubscription();

    return () => {
      cancelled = true;
    };
  }, [appSlug]);

  const hasFeature = (feature: string): boolean => {
    if (!subscription || subscription.status !== 'active') {
      return false;
    }
    return subscription.features[feature] === true;
  };

  const getFeature = <T = unknown>(feature: string): T | undefined => {
    if (!subscription || subscription.status !== 'active') {
      return undefined;
    }
    return subscription.features[feature] as T | undefined;
  };

  // Default to free plan limits if no subscription or not active
  // Free plan: max_rooms: 10, max_buildings: 1
  const maxRooms = subscription && subscription.status === 'active'
    ? (subscription.features.max_rooms as number | undefined) ?? 10
    : 10; // Default to free plan limit

  const maxBuildings = subscription && subscription.status === 'active'
    ? (subscription.features.max_buildings as number | undefined) ?? 1
    : 1; // Default to free plan limit

  const canExportReports = hasFeature('export_reports');
  const hasAdvancedReports = hasFeature('advanced_reports');

  return {
    subscription,
    loading,
    hasFeature,
    getFeature,
    maxRooms,
    maxBuildings,
    canExportReports,
    hasAdvancedReports,
  };
}

