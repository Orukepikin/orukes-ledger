import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { transactionSchema } from '@/lib/validations';
import { checkPlanLimits, PlanType } from '@/lib/stripe';
import { TransactionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const type = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const where: any = { businessId };
    if (type && type !== 'all') where.type = type;
    if (categoryId) where.categoryId = categoryId;

    const total = await prisma.transaction.count({ where });

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, color: true } },
        account: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = transactionSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    const { businessId, ...transactionData } = validatedData.data;

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (membership.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Viewers cannot create transactions' },
        { status: 403 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { businessId },
    });

    const plan = (subscription?.plan || 'FREE') as PlanType;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactionCount = await prisma.transaction.count({
      where: { businessId, createdAt: { gte: startOfMonth } },
    });

    const limits = checkPlanLimits(plan, { transactions: transactionCount });

    if (!limits.allowed) {
      return NextResponse.json({ error: limits.reason }, { status: 403 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { enableApprovals: true },
    });

    let status: TransactionStatus = 'APPROVED';
    if (business?.enableApprovals && membership.role === 'STAFF') {
      status = 'PENDING';
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...transactionData,
        businessId,
        userId: session.user.id,
        status,
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        account: { select: { id: true, name: true, type: true } },
      },
    });

    if (status === 'APPROVED' && transactionData.accountId) {
      const balanceChange =
        transactionData.type === 'INCOME'
          ? transactionData.amount
          : -transactionData.amount;

      await prisma.bankAccount.update({
        where: { id: transactionData.accountId },
        data: { currentBalance: { increment: balanceChange } },
      });
    }

    await prisma.auditLog.create({
      data: {
        businessId,
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'TRANSACTION',
        entityId: transaction.id,
        newData: transaction,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}