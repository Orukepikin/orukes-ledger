import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { transactionSchema } from '@/lib/validations';
import { checkPlanLimits, PlanType } from '@/lib/stripe';

// Get transactions
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
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Verify user has access to this business
    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build where clause
    const where: any = { businessId };

    if (type && type !== 'all') {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (accountId) {
      where.accountId = accountId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.transaction.count({ where });

    // Get transactions
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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// Create transaction
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

    // Verify user has access to this business
    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user can create transactions (not VIEWER)
    if (membership.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Viewers cannot create transactions' },
        { status: 403 }
      );
    }

    // Check plan limits
    const subscription = await prisma.subscription.findUnique({ 
      where: { businessId } 
    });
    
    const plan = (subscription?.plan || 'FREE') as PlanType;
    
    // Count transactions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const transactionCount = await prisma.transaction.count({
      where: {
        businessId,
        createdAt: { gte: startOfMonth },
      },
    });

    const limits = checkPlanLimits(plan, { transactions: transactionCount });

    if (!limits.allowed) {
      return NextResponse.json({ error: limits.reason }, { status: 403 });
    }

    // Get business settings for approval workflow
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { enableApprovals: true },
    });

    // Determine transaction status
    let status = 'APPROVED';
    if (business?.enableApprovals && membership.role === 'STAFF') {
      status = 'PENDING';
    }

    // Create the transaction
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

    // Update account balance if approved
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

    // Create audit log
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
