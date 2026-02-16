import Stripe from 'stripe';
import prisma from './prisma';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export const PLANS = {
  FREE: {
    name: 'Free',
    maxBusinesses: 1,
    maxUsers: 1,
    maxTransactionsPerMonth: 100,
    features: ['Basic reports', 'CSV export', '1 business', '1 user'],
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  PRO: {
    name: 'Pro',
    maxBusinesses: 1,
    maxUsers: 5,
    maxTransactionsPerMonth: -1,
    features: [
      'Unlimited transactions',
      'All reports',
      'Receipt uploads',
      '1 business',
      'Up to 5 users',
      'Email support',
    ],
    monthlyPrice: 15,
    yearlyPrice: 150,
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  BUSINESS: {
    name: 'Business',
    maxBusinesses: 3,
    maxUsers: 15,
    maxTransactionsPerMonth: -1,
    features: [
      'Everything in Pro',
      'Up to 3 businesses',
      'Up to 15 users',
      'Approvals workflow',
      'Recurring transactions',
      'Advanced exports',
      'Priority support',
    ],
    monthlyPrice: 30,
    yearlyPrice: 300,
    stripePriceIdMonthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
  },
} as const;

export type PlanType = keyof typeof PLANS;

export function canAccessFeature(plan: SubscriptionPlan, feature: string): boolean {
  const featureMap: Record<string, SubscriptionPlan[]> = {
    'receipt-uploads': ['PRO', 'BUSINESS'],
    'approvals': ['BUSINESS'],
    'recurring': ['PRO', 'BUSINESS'],
    'advanced-exports': ['BUSINESS'],
    'invite-users': ['PRO', 'BUSINESS'],
    'pdf-reports': ['PRO', 'BUSINESS'],
  };
  const allowedPlans = featureMap[feature];
  if (!allowedPlans) return true;
  return allowedPlans.includes(plan);
}

export async function checkPlanLimits(businessId: string, plan: SubscriptionPlan) {
  const planConfig = PLANS[plan];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const currentTransactions = await prisma.transaction.count({
    where: { businessId, createdAt: { gte: startOfMonth } },
  });

  const currentUsers = await prisma.businessMember.count({
    where: { businessId },
  });

  const transactionLimit = planConfig.maxTransactionsPerMonth;
  const userLimit = planConfig.maxUsers;

  return {
    canAddTransaction: transactionLimit === -1 || currentTransactions < transactionLimit,
    canAddUser: currentUsers < userLimit,
    canAddBusiness: true,
    currentTransactions,
    currentUsers,
    transactionLimit: transactionLimit === -1 ? Infinity : transactionLimit,
    userLimit,
  };
}

export async function createCheckoutSession(
  businessId: string,
  plan: 'PRO' | 'BUSINESS',
  interval: 'month' | 'year',
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
    include: { business: true },
  });
  if (!subscription) throw new Error('Subscription not found');

  const owner = await prisma.businessMember.findFirst({
    where: { businessId, role: 'OWNER' },
    include: { user: true },
  });
  if (!owner) throw new Error('Business owner not found');

  const planConfig = PLANS[plan];
  const priceId = interval === 'month' ? planConfig.stripePriceIdMonthly : planConfig.stripePriceIdYearly;
  if (!priceId) throw new Error('Price ID not configured');

  let customerId = subscription.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: owner.user.email,
      name: owner.user.name || undefined,
      metadata: { businessId, businessName: subscription.business.name },
    });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { businessId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { businessId, plan },
  });
  return session.url!;
}

export async function createBillingPortalSession(businessId: string, returnUrl: string): Promise<string> {
  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription?.stripeCustomerId) throw new Error('No Stripe customer found');
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'ACTIVE',
    canceled: 'CANCELLED',
    past_due: 'PAST_DUE',
    trialing: 'TRIALING',
    incomplete: 'PAST_DUE',
    incomplete_expired: 'CANCELLED',
    unpaid: 'PAST_DUE',
    paused: 'CANCELLED',
  };
  return statusMap[status] || 'ACTIVE';
}

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const businessId = session.metadata?.businessId;
      const plan = session.metadata?.plan as 'PRO' | 'BUSINESS';
      if (businessId && plan && session.subscription) {
        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await prisma.subscription.update({
          where: { businessId },
          data: {
            plan: plan,
            status: 'ACTIVE',
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: stripeSubscription.items.data[0]?.price.id,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          },
        });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: mapStripeStatus(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { plan: 'FREE', status: 'CANCELLED', stripeSubscriptionId: null, stripePriceId: null },
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: invoice.subscription as string },
          data: { status: 'PAST_DUE' },
        });
      }
      break;
    }
  }
}

export async function cancelSubscription(businessId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (subscription?.stripeSubscriptionId) {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
    await prisma.subscription.update({ where: { businessId }, data: { cancelAtPeriodEnd: true } });
  }
}

export async function resumeSubscription(businessId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (subscription?.stripeSubscriptionId) {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: false });
    await prisma.subscription.update({ where: { businessId }, data: { cancelAtPeriodEnd: false } });
  }
}
