// React hook for subscription management
// File: src/hooks/use-subscription.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { PLANS, type PlanType, type PlanLimits } from '@/lib/plans';

interface SubscriptionData {
  id: string;
  plan: PlanType;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface UsageData {
  transactions: { used: number; limit: number; unlimited: boolean };
  members: { used: number; limit: number };
  businesses: { used: number; limit: number };
}

interface UseSubscriptionReturn {
  subscription: SubscriptionData | null;
  usage: UsageData | null;
  limits: PlanLimits | null;
  isLoading: boolean;
  error: string | null;
  checkLimit: (
    checkType: 'transaction' | 'member' | 'business' | 'feature',
    feature?: string
  ) => Promise<{ allowed: boolean; reason: string }>;
  canUseFeature: (feature: keyof PlanLimits['features']) => boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(businessId: string | null): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSubscription = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/subscription?businessId=${businessId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(data.subscription);
      setUsage(data.usage);
      setLimits(data.limits);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching subscription:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const checkLimit = useCallback(
    async (
      checkType: 'transaction' | 'member' | 'business' | 'feature',
      feature?: string
    ): Promise<{ allowed: boolean; reason: string }> => {
      if (!businessId) {
        return { allowed: false, reason: 'No business selected' };
      }

      try {
        const response = await fetch('/api/subscription/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, checkType, feature }),
        });

        const data = await response.json();

        if (!data.allowed) {
          toast({
            title: 'Upgrade Required',
            description: data.reason,
            variant: 'destructive',
            action: (
              <a href="/app/settings/billing" className="underline">
                Upgrade Now
              </a>
            ),
          });
        }

        return { allowed: data.allowed, reason: data.reason };
      } catch (err) {
        console.error('Error checking limit:', err);
        return { allowed: true, reason: '' }; // Allow on error to not block users
      }
    },
    [businessId, toast]
  );

  const canUseFeature = useCallback(
    (feature: keyof PlanLimits['features']): boolean => {
      if (!limits) return false;
      return limits.features[feature];
    },
    [limits]
  );

  return {
    subscription,
    usage,
    limits,
    isLoading,
    error,
    checkLimit,
    canUseFeature,
    refresh: fetchSubscription,
  };
}
