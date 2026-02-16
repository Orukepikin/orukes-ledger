import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { createTransactionSchema, transactionFilterSchema } from '@/lib/validations';
import { checkPlanLimits } from '@/lib/stripe';

// Get transactions with filters
export async function GET(request: Request) {
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

    // Verify access
    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse filters
    const filters = transactionFilterSchema.parse({
      type: searchParams.get('type') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      accountId: searchParams.get('accountId') || undefined,
      paymentMethod: searchParams.get('paymentMethod') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

    // Build where clause
    const where: any = { businessId };

    if (filters.type) where.type = filters.type;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }
    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = filters.minAmount;
      if (filters.maxAmount) where.amount.lte = filters.maxAmount;
    }
    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { vendorName: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.transaction.count({ where });

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
        user: { select: { id: true, name: true, email: true } },
        attachments: true,
      },
      orderBy: { date: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    return NextResponse.json({
      transactions,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// Create transaction
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, ...transactionData } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Verify access and check if user can create transactions
    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Viewers cannot create transactions' }, { status: 403 });
    }

    // Validate input
    const validatedData = createTransactionSchema.safeParse(transactionData);
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.errors[0].message }, { status: 400 });
    }

    // Check plan limits
    const subscription = await prisma.subscription.findUnique({ where: { businessId } });
    const limits = await checkPlanLimits(businessId, subscription?.plan || 'FREE');

    if (!limits.canAddTransaction) {
      return NextResponse.json(
        { error: 'Transaction limit reached. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });

    // Determine transaction status based on approval settings
    const needsApproval = business?.enableApprovals && membership.role === 'STAFF';
    const status = needsApproval ? 'PENDING' : 'APPROVED';

    const { type, amount, categoryId, accountId, toAccountId, date, paymentMethod, vendorName, customerName, description, tags, isRecurring, recurringRule } = validatedData.data;

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        businessId,
        userId: session.user.id,
        type,
        amount,
        categoryId: categoryId || null,
        accountId,
        toAccountId: type === 'TRANSFER' ? toAccountId : null,
        date: new Date(date),
        paymentMethod,
        vendorName,
        customerName,
        description,
        tags: tags || [],
        isRecurring,
        recurringRule,
        status,
      },
      include: { category: true, account: true },
    });

    // Update account balance if approved
    if (status === 'APPROVED') {
      if (type === 'INCOME') {
        await prisma.bankAccount.update({
          where: { id: accountId },
          data: { currentBalance: { increment: amount } },
        });
      } else if (type === 'EXPENSE') {
        await prisma.bankAccount.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: amount } },
        });
      } else if (type === 'TRANSFER' && toAccountId) {
        await prisma.bankAccount.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: amount } },
        });
        await prisma.bankAccount.update({
          where: { id: toAccountId },
          data: { currentBalance: { increment: amount } },
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        businessId,
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'transaction',
        entityId: transaction.id,
        newData: transaction as any,
      },
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
