// API route for subscription management
// File: src/app/api/subscription/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PLAN_LIMITS, getPlanLimits, type PlanType } from '@/lib/plans';

// GET - Get current subscription for a business
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      );
    }

    // Verify user has access to this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: session.user.id,
          businessId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get subscription
    let subscription = await prisma.subscription.findUnique({
      where: { businessId },
    });

    // Create FREE subscription if none exists
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          businessId,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });
    }

    // Get usage stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [transactionCount, memberCount, businessCount] = await Promise.all([
      // Transactions this month
      prisma.transaction.count({
        where: {
          businessId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      // Team members
      prisma.businessMember.count({
        where: { businessId },
      }),
      // Total businesses owned by this user
      prisma.businessMember.count({
        where: {
          userId: session.user.id,
          role: 'OWNER',
        },
      }),
    ]);

    const limits = getPlanLimits(subscription.plan as PlanType);

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      usage: {
        transactions: {
          used: transactionCount,
          limit: limits.maxTransactionsPerMonth,
          unlimited: limits.maxTransactionsPerMonth === -1,
        },
        members: {
          used: memberCount,
          limit: limits.maxUsersPerBusiness,
        },
        businesses: {
          used: businessCount,
          limit: limits.maxBusinesses,
        },
      },
      limits,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
