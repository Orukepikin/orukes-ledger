// API route to check if action is allowed by subscription
// File: src/app/api/subscription/check/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPlanLimits, canAccessFeature, type PlanType } from '@/lib/plans';

type CheckType = 
  | 'transaction' 
  | 'member' 
  | 'business' 
  | 'feature';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, checkType, feature } = body as {
      businessId: string;
      checkType: CheckType;
      feature?: string;
    };

    if (!businessId || !checkType) {
      return NextResponse.json(
        { error: 'businessId and checkType required' },
        { status: 400 }
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { businessId },
    });

    const plan = (subscription?.plan || 'FREE') as PlanType;
    const limits = getPlanLimits(plan);

    let allowed = true;
    let reason = '';
    let usage = { used: 0, limit: 0 };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (checkType) {
      case 'transaction':
        // Check transaction limit
        if (limits.maxTransactionsPerMonth !== -1) {
          const count = await prisma.transaction.count({
            where: {
              businessId,
              createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
          });
          usage = { used: count, limit: limits.maxTransactionsPerMonth };
          if (count >= limits.maxTransactionsPerMonth) {
            allowed = false;
            reason = `You've reached your monthly limit of ${limits.maxTransactionsPerMonth} transactions. Upgrade to Pro for unlimited transactions.`;
          }
        }
        break;

      case 'member':
        // Check team member limit
        const memberCount = await prisma.businessMember.count({
          where: { businessId },
        });
        usage = { used: memberCount, limit: limits.maxUsersPerBusiness };
        if (memberCount >= limits.maxUsersPerBusiness) {
          allowed = false;
          reason = `You've reached your limit of ${limits.maxUsersPerBusiness} team members. Upgrade to add more.`;
        }
        break;

      case 'business':
        // Check business limit
        const businessCount = await prisma.businessMember.count({
          where: {
            userId: session.user.id,
            role: 'OWNER',
          },
        });
        usage = { used: businessCount, limit: limits.maxBusinesses };
        if (businessCount >= limits.maxBusinesses) {
          allowed = false;
          reason = `You've reached your limit of ${limits.maxBusinesses} business${limits.maxBusinesses > 1 ? 'es' : ''}. Upgrade to Business plan for up to 3 businesses.`;
        }
        break;

      case 'feature':
        // Check feature access
        if (feature) {
          const featureKey = feature as keyof typeof limits.features;
          if (limits.features[featureKey] !== undefined) {
            allowed = limits.features[featureKey];
            if (!allowed) {
              const featureNames: Record<string, string> = {
                receipts: 'Receipt uploads',
                recurringTransactions: 'Recurring transactions',
                approvalWorkflows: 'Approval workflows',
                apiAccess: 'API access',
                prioritySupport: 'Priority support',
              };
              reason = `${featureNames[feature] || feature} is not available on the ${plan} plan. Upgrade to unlock this feature.`;
            }
          }
        }
        break;
    }

    return NextResponse.json({
      allowed,
      reason,
      plan,
      usage,
      upgradeUrl: '/app/settings/billing',
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
}
