import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { createBudgetSchema } from '@/lib/validations';

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
        const startOfPeriod = new Date(budget.startDate);
        const endOfPeriod = budget.endDate || new Date();

        const spent = await prisma.transaction.aggregate({
          where: {
            businessId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            status: 'APPROVED',
            date: {
              gte: startOfPeriod,
              lte: endOfPeriod,
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
          isNearLimit: percentage >= budget.alertThreshold,
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
    const validatedData = createBudgetSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    const { businessId, categoryId, amount, period, startDate, endDate, alertThreshold } = validatedData.data;

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
        amount,
        period,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
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