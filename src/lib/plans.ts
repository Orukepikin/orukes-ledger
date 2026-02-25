// Plan limits configuration
// File: src/lib/plans.ts

export type PlanType = 'FREE' | 'PRO' | 'BUSINESS';

export interface PlanLimits {
  maxBusinesses: number;
  maxUsersPerBusiness: number;
  maxTransactionsPerMonth: number;
  features: {
    reports: boolean;
    budgets: boolean;
    receipts: boolean;
    recurringTransactions: boolean;
    approvalWorkflows: boolean;
    csvExport: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

export interface PlanInfo {
  id: PlanType;
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string;
  limits: PlanLimits;
  popular?: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  FREE: {
    maxBusinesses: 1,
    maxUsersPerBusiness: 1,
    maxTransactionsPerMonth: 100,
    features: {
      reports: true,
      budgets: true,
      receipts: false,
      recurringTransactions: false,
      approvalWorkflows: false,
      csvExport: true,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  PRO: {
    maxBusinesses: 1,
    maxUsersPerBusiness: 5,
    maxTransactionsPerMonth: -1, // unlimited
    features: {
      reports: true,
      budgets: true,
      receipts: true,
      recurringTransactions: true,
      approvalWorkflows: false,
      csvExport: true,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  BUSINESS: {
    maxBusinesses: 3,
    maxUsersPerBusiness: 15,
    maxTransactionsPerMonth: -1, // unlimited
    features: {
      reports: true,
      budgets: true,
      receipts: true,
      recurringTransactions: true,
      approvalWorkflows: true,
      csvExport: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
};

export const PLANS: PlanInfo[] = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    currency: 'NGN',
    period: 'forever',
    description: 'Perfect for getting started',
    limits: PLAN_LIMITS.FREE,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 5000,
    currency: 'NGN',
    period: 'month',
    description: 'For growing businesses',
    limits: PLAN_LIMITS.PRO,
    popular: true,
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 15000,
    currency: 'NGN',
    period: 'month',
    description: 'For multiple businesses',
    limits: PLAN_LIMITS.BUSINESS,
  },
];

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

export function getPlanInfo(plan: PlanType): PlanInfo | undefined {
  return PLANS.find((p) => p.id === plan);
}

export function formatPrice(amount: number, currency: string = 'NGN'): string {
  const symbols: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
  };
  return `${symbols[currency] || currency}${amount.toLocaleString()}`;
}

export function canAccessFeature(
  plan: PlanType,
  feature: keyof PlanLimits['features']
): boolean {
  const limits = getPlanLimits(plan);
  return limits.features[feature];
}

export function getUpgradeReason(
  plan: PlanType,
  feature: keyof PlanLimits['features']
): string {
  const reasons: Record<keyof PlanLimits['features'], string> = {
    reports: 'Upgrade to access advanced reports',
    budgets: 'Upgrade to create budgets',
    receipts: 'Upgrade to Pro to upload receipts',
    recurringTransactions: 'Upgrade to Pro for recurring transactions',
    approvalWorkflows: 'Upgrade to Business for approval workflows',
    csvExport: 'Upgrade to export data as CSV',
    apiAccess: 'Upgrade to Business for API access',
    prioritySupport: 'Upgrade to Business for priority support',
  };
  return reasons[feature];
}
