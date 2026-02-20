import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const budgets = await prisma.budget.findMany({
      where: { businessId },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const spent = await prisma.transaction.aggregate({
          where: {
            businessId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            status: 'APPROVED',
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          _sum: { amount: true },
        });

        const spentAmount = spent._sum.amount || 0;
        const percentage = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;

        return {
          ...budget,
          spent: spentAmount,
          remaining: budget.amount - spentAmount,
          percentage: Math.round(percentage * 100) / 100,
          isOverBudget: spentAmount > budget.amount,
          isNearLimit: percentage >= (budget.alertThreshold || 80),
        };
      })
    );

    return NextResponse.json({ budgets: budgetsWithSpending });
  } catch (error) {
    console.error('Get budgets error:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, categoryId, amount, alertThreshold } = body;

    if (!businessId || !categoryId || !amount) {
      return NextResponse.json(
        { error: 'Business ID, category, and amount are required' },
        { status: 400 }
      );
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (membership.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Viewers cannot create budgets' },
        { status: 403 }
      );
    }

    const existing = await prisma.budget.findFirst({
      where: {
        businessId,
        categoryId,
        isActive: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An active budget already exists for this category' },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.create({
      data: {
        businessId,
        categoryId,
        amount: parseFloat(amount),
        alertThreshold: alertThreshold || 80,
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error('Create budget error:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}