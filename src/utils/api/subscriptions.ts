// Subscription API functions

import { api } from '../api';

export interface Subscription {
  id: number;
  appSlug: string;
  appName: string;
  planSlug: string;
  planName: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  startDate: string;
  endDate: string;
  remainingDays: number;
  features: Record<string, unknown>;
}

export interface CreateSubscriptionResponse {
  subscription: Subscription;
  extended: boolean;
}

export const subscriptionApi = {
  getAll: async (): Promise<Subscription[]> => {
    const response = await api.get<{ subscriptions: Subscription[] }>('/subscriptions');
    return response.subscriptions;
  },

  getByApp: async (appSlug: string): Promise<Subscription | null> => {
    try {
      const response = await api.get<{ subscription: Subscription }>(`/subscriptions/${appSlug}`);
      return response.subscription;
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error && (error as any).statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (
    appSlug: string,
    planSlug: string,
    durationDays: number,
    paymentMethod?: string
  ): Promise<CreateSubscriptionResponse> => {
    const response = await api.post<CreateSubscriptionResponse>('/subscriptions', {
      appSlug,
      planSlug,
      durationDays,
      paymentMethod: paymentMethod || null,
    });
    return response;
  },

  cancel: async (appSlug: string): Promise<void> => {
    await api.delete(`/subscriptions/${appSlug}`);
  },
};

