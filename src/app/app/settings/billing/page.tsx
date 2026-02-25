// Billing/Subscription settings page
// File: src/app/app/settings/billing/page.tsx

'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  Crown,
  Loader2,
  Sparkles,
  Users,
  Zap,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { PLANS, formatPrice, type PlanType } from '@/lib/plans';
import { useSubscription } from '@/hooks/use-subscription';

export default function BillingPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const { subscription, usage, limits, isLoading, refresh } = useSubscription(businessId);
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('currentBusinessId');
    setBusinessId(id);
  }, []);

  const handleUpgrade = async (planId: PlanType) => {
    setSelectedPlan(planId);
    setIsUpgrading(true);

    // TODO: Integrate with Paystack here
    // For now, show a message
    toast({
      title: 'Payment Integration Coming Soon',
      description: 'Paystack integration will be added to process payments. For now, contact us to upgrade.',
    });

    setIsUpgrading(false);
    setSelectedPlan(null);
  };

  const currentPlan = subscription?.plan || 'FREE';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Billing & Subscription
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Current Plan & Usage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge
                  variant={currentPlan === 'FREE' ? 'secondary' : 'default'}
                  className={
                    currentPlan === 'PRO'
                      ? 'bg-green-100 text-green-700'
                      : currentPlan === 'BUSINESS'
                      ? 'bg-purple-100 text-purple-700'
                      : ''
                  }
                >
                  {currentPlan}
                </Badge>
              </CardTitle>
              <CardDescription>
                {currentPlan === 'FREE'
                  ? 'Upgrade to unlock more features'
                  : `Your subscription renews on ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}`}
              </CardDescription>
            </div>
            {currentPlan !== 'BUSINESS' && (
              <Button onClick={() => handleUpgrade(currentPlan === 'FREE' ? 'PRO' : 'BUSINESS')}>
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Transactions Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Transactions this month</span>
                <span className="font-medium">
                  {usage?.transactions.unlimited
                    ? `${usage.transactions.used} / ∞`
                    : `${usage?.transactions.used || 0} / ${usage?.transactions.limit || 100}`}
                </span>
              </div>
              {!usage?.transactions.unlimited && (
                <Progress
                  value={
                    ((usage?.transactions.used || 0) / (usage?.transactions.limit || 100)) * 100
                  }
                  className="h-2"
                />
              )}
              {!usage?.transactions.unlimited &&
                (usage?.transactions.used || 0) >= (usage?.transactions.limit || 100) * 0.8 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Approaching limit
                  </p>
                )}
            </div>

            {/* Team Members Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Team members</span>
                <span className="font-medium">
                  {usage?.members.used || 1} / {usage?.members.limit || 1}
                </span>
              </div>
              <Progress
                value={((usage?.members.used || 1) / (usage?.members.limit || 1)) * 100}
                className="h-2"
              />
            </div>

            {/* Businesses Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Businesses</span>
                <span className="font-medium">
                  {usage?.businesses.used || 1} / {usage?.businesses.limit || 1}
                </span>
              </div>
              <Progress
                value={((usage?.businesses.used || 1) / (usage?.businesses.limit || 1)) * 100}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isDowngrade =
              (currentPlan === 'BUSINESS' && plan.id !== 'BUSINESS') ||
              (currentPlan === 'PRO' && plan.id === 'FREE');

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular
                    ? 'border-green-500 border-2 shadow-lg'
                    : isCurrentPlan
                    ? 'border-gray-400 border-2'
                    : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-500">Most Popular</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline">Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {plan.id === 'BUSINESS' && <Crown className="w-5 h-5 text-purple-500" />}
                    {plan.id === 'PRO' && <Zap className="w-5 h-5 text-green-500" />}
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                    <span className="text-gray-500">
                      /{plan.period}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.limits.maxBusinesses} business
                        {plan.limits.maxBusinesses > 1 ? 'es' : ''}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.limits.maxUsersPerBusiness} team member
                        {plan.limits.maxUsersPerBusiness > 1 ? 's' : ''}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.limits.maxTransactionsPerMonth === -1
                          ? 'Unlimited'
                          : plan.limits.maxTransactionsPerMonth}{' '}
                        transactions/month
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Reports & budgets</span>
                    </li>
                    {plan.limits.features.receipts && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Receipt uploads</span>
                      </li>
                    )}
                    {plan.limits.features.recurringTransactions && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Recurring transactions</span>
                      </li>
                    )}
                    {plan.limits.features.approvalWorkflows && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Approval workflows</span>
                      </li>
                    )}
                    {plan.limits.features.prioritySupport && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Priority support</span>
                      </li>
                    )}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || isDowngrade || isUpgrading}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isUpgrading && selectedPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : isDowngrade ? (
                      'Contact to Downgrade'
                    ) : (
                      <>
                        Upgrade to {plan.name}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment Methods - Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your payment methods for subscription billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Payment methods will be available when Paystack integration is complete.</p>
            <p className="text-sm mt-2">
              Contact us at{' '}
              <a href="mailto:support@orukesledger.com" className="text-green-600 hover:underline">
                support@orukesledger.com
              </a>{' '}
              to upgrade manually.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">Can I change my plan anytime?</h4>
            <p className="text-sm text-gray-600 mt-1">
              Yes! You can upgrade at any time. Downgrades take effect at the end of your billing period.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">What payment methods do you accept?</h4>
            <p className="text-sm text-gray-600 mt-1">
              We accept all major Nigerian bank cards, bank transfers, and USSD payments via Paystack.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">What happens if I exceed my limits?</h4>
            <p className="text-sm text-gray-600 mt-1">
              You'll be prompted to upgrade. Your existing data is never deleted - you just can't add more until you upgrade.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Is there a refund policy?</h4>
            <p className="text-sm text-gray-600 mt-1">
              Yes, we offer a 7-day money-back guarantee on all paid plans. No questions asked.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
