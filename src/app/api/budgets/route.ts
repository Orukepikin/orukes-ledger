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
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true },
    });

    const budgets = await prisma.budget.findMany({
      where: { businessId, month, year },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        businessId,
        type: 'EXPENSE',
        status: 'APPROVED',
        date: { gte: startDate, lte: endDate },
      },
    });

    const budgetsWithSpending = budgets.map((budget) => {
      const spent = transactions
        .filter((t) => t.categoryId === budget.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;

      return {
        ...budget,
        spent,
        remaining: budget.amount - spent,
        percentage,
      };
    });

    return NextResponse.json({ budgets: budgetsWithSpending, currency: business?.currency || 'NGN' });
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
    const { businessId, categoryId, amount, month, year, carryOver } = body;

    if (!businessId || amount === undefined || !month || !year) {
      return NextResponse.json(
        { error: 'Business ID, amount, month, and year are required' },
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
      where: { businessId, categoryId: categoryId || null, month, year },
    });

    if (existing) {
      const budget = await prisma.budget.update({
        where: { id: existing.id },
        data: { amount: parseFloat(amount), carryOver: carryOver || false },
        include: { category: true },
      });
      return NextResponse.json({ budget });
    }

    const budget = await prisma.budget.create({
      data: {
        businessId,
        categoryId: categoryId || null,
        amount: parseFloat(amount),
        month,
        year,
        carryOver: carryOver || false,
      },
      include: { category: true },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error('Create budget error:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}