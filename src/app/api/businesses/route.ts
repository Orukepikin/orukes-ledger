import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { createBusinessSchema } from '@/lib/validations';
import { checkPlanLimits, PlanType } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businesses = await prisma.business.findMany({
      where: {
        members: {
          some: { userId: session.user.id },
        },
      },
      include: {
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
        _count: {
          select: { members: true, transactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedBusinesses = businesses.map((business) => ({
      id: business.id,
      name: business.name,
      industry: business.industry,
      currency: business.currency,
      role: business.members[0]?.role,
      memberCount: business._count.members,
      transactionCount: business._count.transactions,
      createdAt: business.createdAt,
    }));

    return NextResponse.json({ businesses: formattedBusinesses });
  } catch (error) {
    console.error('Get businesses error:', error);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBusinessSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, industry, currency, openingCashBalance, openingBankBalance } = validatedData.data;

    const existingBusinesses = await prisma.business.count({
      where: {
        members: {
          some: { userId: session.user.id, role: 'OWNER' },
        },
      },
    });

    const limits = checkPlanLimits('FREE' as PlanType, { businesses: existingBusinesses });

    if (!limits.allowed) {
      return NextResponse.json({ error: limits.reason }, { status: 403 });
    }

    const business = await prisma.business.create({
      data: {
        name,
        industry,
        currency: currency || 'NGN',
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
        bankAccounts: {
          create: [
            {
              name: 'Cash',
              type: 'CASH',
              openingBalance: openingCashBalance || 0,
              currentBalance: openingCashBalance || 0,
              isDefault: true,
            },
            {
              name: 'Bank Account',
              type: 'BANK',
              openingBalance: openingBankBalance || 0,
              currentBalance: openingBankBalance || 0,
            },
          ],
        },
        categories: {
          create: [
            { name: 'Sales', type: 'INCOME', color: '#22c55e', isDefault: true },
            { name: 'Services', type: 'INCOME', color: '#3b82f6' },
            { name: 'Other Income', type: 'INCOME', color: '#8b5cf6' },
            { name: 'Rent', type: 'EXPENSE', color: '#ef4444', isDefault: true },
            { name: 'Utilities', type: 'EXPENSE', color: '#f97316' },
            { name: 'Supplies', type: 'EXPENSE', color: '#eab308' },
            { name: 'Transport', type: 'EXPENSE', color: '#14b8a6' },
            { name: 'Salaries', type: 'EXPENSE', color: '#ec4899' },
            { name: 'Marketing', type: 'EXPENSE', color: '#6366f1' },
            { name: 'Other Expenses', type: 'EXPENSE', color: '#64748b' },
          ],
        },
      },
      include: {
        members: true,
        bankAccounts: true,
      },
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error('Create business error:', error);
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
  }
}