import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export type PlanType = 'FREE' | 'PRO' | 'BUSINESS';

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxTransactions: 100,
    maxBusinesses: 1,
    maxUsers: 1,
    features: [
      '1 business workspace',
      '1 user',
      '100 transactions/month',
      'Basic reports',
      'CSV export',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 5000,
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    maxTransactions: -1,
    maxBusinesses: 1,
    maxUsers: 5,
    features: [
      '1 business workspace',
      'Up to 5 team members',
      'Unlimited transactions',
      'All reports & charts',
      'Receipt uploads',
      'Email support',
    ],
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  BUSINESS: {
    name: 'Business',
    price: 15000,
    monthlyPrice: 15000,
    yearlyPrice: 150000,
    maxTransactions: -1,
    maxBusinesses: 3,
    maxUsers: 15,
    features: [
      'Up to 3 businesses',
      'Up to 15 team members',
      'Everything in Pro',
      'Approval workflows',
      'Recurring transactions',
      'Priority support',
    ],
    stripePriceIdMonthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
  },
};

interface PlanLimitsInput {
  transactions?: number;
  businesses?: number;
  users?: number;
}

interface PlanLimitsResult {
  allowed: boolean;
  reason?: string;
}

export function checkPlanLimits(plan: PlanType, current: PlanLimitsInput): PlanLimitsResult {
  const planConfig = PLANS[plan];

  if (current.transactions !== undefined && planConfig.maxTransactions !== -1) {
    if (current.transactions >= planConfig.maxTransactions) {
      return {
        allowed: false,
        reason: `You've reached the ${planConfig.maxTransactions} transaction limit for the ${planConfig.name} plan. Upgrade to add more transactions.`,
      };
    }
  }

  if (current.businesses !== undefined) {
    if (current.businesses >= planConfig.maxBusinesses) {
      return {
        allowed: false,
        reason: `You've reached the ${planConfig.maxBusinesses} business limit for the ${planConfig.name} plan. Upgrade to add more businesses.`,
      };
    }
  }

  if (current.users !== undefined) {
    if (current.users >= planConfig.maxUsers) {
      return {
        allowed: false,
        reason: `You've reached the ${planConfig.maxUsers} user limit for the ${planConfig.name} plan. Upgrade to add more team members.`,
      };
    }
  }

  return { allowed: true };
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function createCheckoutSession(
  businessId: string,
  plan: 'PRO' | 'BUSINESS',
  billingPeriod: 'monthly' | 'yearly',
  customerId?: string
) {
  const planConfig = PLANS[plan];
  const priceId = billingPeriod === 'monthly' 
    ? planConfig.stripePriceIdMonthly 
    : planConfig.stripePriceIdYearly;

  if (!priceId) {
    throw new Error('Price ID not configured');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings?canceled=true`,
    metadata: { businessId, plan },
    ...(customerId && { customer: customerId }),
  });

  return session;
}

export async function createBillingPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings`,
  });

  return session;
}
