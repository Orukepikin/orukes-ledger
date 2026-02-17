import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia',
});

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    maxTransactions: 100,
    maxBusinesses: 1,
    maxUsers: 1,
    features: ['Basic dashboard', 'Up to 100 transactions/month', 'Basic reports'],
  },
  PRO: {
    name: 'Pro',
    priceMonthly: 15,
    priceYearly: 150,
    maxTransactions: -1, // unlimited
    maxBusinesses: 1,
    maxUsers: 5,
    features: [
      'Unlimited transactions',
      'Advanced reports',
      'Receipt uploads',
      'CSV export',
      'Up to 5 team members',
      'Recurring transactions',
    ],
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  BUSINESS: {
    name: 'Business',
    priceMonthly: 30,
    priceYearly: 300,
    maxTransactions: -1,
    maxBusinesses: 3,
    maxUsers: 15,
    features: [
      'Everything in Pro',
      'Up to 3 businesses',
      'Up to 15 team members',
      'Approval workflows',
      'Priority support',
      'Custom categories',
    ],
    stripePriceIdMonthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
  },
};

export type PlanType = keyof typeof PLANS;

export function canAccessFeature(
  plan: PlanType,
  feature: 'receipts' | 'recurring' | 'approvals' | 'export' | 'advancedReports'
): boolean {
  const featureAccess: Record<string, PlanType[]> = {
    receipts: ['PRO', 'BUSINESS'],
    recurring: ['PRO', 'BUSINESS'],
    approvals: ['BUSINESS'],
    export: ['PRO', 'BUSINESS'],
    advancedReports: ['PRO', 'BUSINESS'],
  };

  return featureAccess[feature]?.includes(plan) ?? false;
}

export function checkPlanLimits(
  plan: PlanType,
  current: { transactions?: number; businesses?: number; users?: number }
): { allowed: boolean; reason?: string } {
  const planConfig = PLANS[plan];

  if (
    planConfig.maxTransactions !== -1 &&
    current.transactions &&
    current.transactions >= planConfig.maxTransactions
  ) {
    return {
      allowed: false,
      reason: `You've reached the ${planConfig.maxTransactions} transaction limit for the ${planConfig.name} plan`,
    };
  }

  if (current.businesses && current.businesses >= planConfig.maxBusinesses) {
    return {
      allowed: false,
      reason: `You can only have ${planConfig.maxBusinesses} business(es) on the ${planConfig.name} plan`,
    };
  }

  if (current.users && current.users >= planConfig.maxUsers) {
    return {
      allowed: false,
      reason: `You can only have ${planConfig.maxUsers} team member(s) on the ${planConfig.name} plan`,
    };
  }

  return { allowed: true };
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  businessId: string,
  successUrl: string,
  cancelUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { businessId },
  });

  return session;
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function handleStripeWebhook(
  event: Stripe.Event,
  prisma: any
) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const businessId = session.metadata?.businessId;
      const subscriptionId = session.subscription as string;

      if (businessId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;

        let plan: PlanType = 'FREE';
        if (priceId === PLANS.PRO.stripePriceIdMonthly || priceId === PLANS.PRO.stripePriceIdYearly) {
          plan = 'PRO';
        } else if (priceId === PLANS.BUSINESS.stripePriceIdMonthly || priceId === PLANS.BUSINESS.stripePriceIdYearly) {
          plan = 'BUSINESS';
        }

        await prisma.subscription.update({
          where: { businessId },
          data: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            plan,
            status: 'ACTIVE',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;

      let plan: PlanType = 'FREE';
      if (priceId === PLANS.PRO.stripePriceIdMonthly || priceId === PLANS.PRO.stripePriceIdYearly) {
        plan = 'PRO';
      } else if (priceId === PLANS.BUSINESS.stripePriceIdMonthly || priceId === PLANS.BUSINESS.stripePriceIdYearly) {
        plan = 'BUSINESS';
      }

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          plan,
          status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          plan: 'FREE',
          status: 'CANCELED',
          stripeSubscriptionId: null,
          stripePriceId: null,
        },
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: 'PAST_DUE' },
        });
      }
      break;
    }
  }
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId);
}