// Upgrade prompt component
// File: src/components/upgrade-prompt.tsx

'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, X, ArrowRight, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatPrice, type PlanType } from '@/lib/plans';

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  feature?: string;
  currentPlan?: PlanType;
  suggestedPlan?: PlanType;
}

export function UpgradePrompt({
  open,
  onClose,
  title = 'Upgrade Required',
  description = "You've reached the limit of your current plan.",
  feature,
  currentPlan = 'FREE',
  suggestedPlan = 'PRO',
}: UpgradePromptProps) {
  const router = useRouter();

  const planBenefits: Record<PlanType, string[]> = {
    FREE: [],
    PRO: [
      'Unlimited transactions',
      'Up to 5 team members',
      'Receipt uploads',
      'Recurring transactions',
    ],
    BUSINESS: [
      'Up to 3 businesses',
      'Up to 15 team members',
      'Approval workflows',
      'Priority support',
      'API access',
    ],
  };

  const planPrices: Record<PlanType, number> = {
    FREE: 0,
    PRO: 5000,
    BUSINESS: 15000,
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4">
            {suggestedPlan === 'BUSINESS' ? (
              <Crown className="w-6 h-6 text-purple-600" />
            ) : (
              <Zap className="w-6 h-6 text-green-600" />
            )}
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
            {feature && (
              <span className="block mt-2 font-medium text-gray-900">
                {feature}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900">
              {suggestedPlan} Plan
            </span>
            <span className="text-green-600 font-bold">
              {formatPrice(planPrices[suggestedPlan])}/month
            </span>
          </div>
          <ul className="space-y-2">
            {planBenefits[suggestedPlan].map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <Sparkles className="w-4 h-4 text-green-500 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={() => {
              router.push('/app/settings/billing');
              onClose();
            }}
            className="w-full"
          >
            Upgrade to {suggestedPlan}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Maybe Later
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-2">
          7-day money-back guarantee • Cancel anytime
        </p>
      </DialogContent>
    </Dialog>
  );
}

// Simple inline upgrade banner
interface UpgradeBannerProps {
  message: string;
  feature?: string;
  className?: string;
}

export function UpgradeBanner({ message, feature, className = '' }: UpgradeBannerProps) {
  const router = useRouter();

  return (
    <div
      className={`flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{message}</p>
          {feature && <p className="text-sm text-gray-600">{feature}</p>}
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => router.push('/app/settings/billing')}
      >
        Upgrade
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
