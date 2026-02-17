import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { createBusinessSchema } from '@/lib/validations';
import { checkPlanLimits, PlanType } from '@/lib/stripe';

// Default categories for new businesses
const DEFAULT_CATEGORIES = [
  // Expense categories
  { name: 'Inventory/Stock', type: 'EXPENSE', color: '#ef4444' },
  { name: 'Rent', type: 'EXPENSE', color: '#f97316' },
  { name: 'Utilities', type: 'EXPENSE', color: '#eab308' },
  { name: 'Salaries', type: 'EXPENSE', color: '#22c55e' },
  { name: 'Transportation', type: 'EXPENSE', color: '#14b8a6' },
  { name: 'Marketing', type: 'EXPENSE', color: '#3b82f6' },
  { name: 'Equipment', type: 'EXPENSE', color: '#8b5cf6' },
  { name: 'Supplies', type: 'EXPENSE', color: '#ec4899' },
  { name: 'Insurance', type: 'EXPENSE', color: '#6366f1' },
  { name: 'Taxes & Fees', type: 'EXPENSE', color: '#71717a' },
  { name: 'Miscellaneous', type: 'EXPENSE', color: '#a3a3a3' },
  // Income categories
  { name: 'Sales', type: 'INCOME', color: '#22c55e' },
  { name: 'Services', type: 'INCOME', color: '#14b8a6' },
  { name: 'Interest', type: 'INCOME', color: '#3b82f6' },
  { name: 'Refunds', type: 'INCOME', color: '#8b5cf6' },
  { name: 'Other Income', type: 'INCOME', color: '#6366f1' },
];

// Get user's businesses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.businessMember.findMany({
      where: { userId: session.user.id },
      include: {
        business: {
          include: {
            subscription: true,
            _count: {
              select: { members: true, transactions: true },
            },
          },
        },
      },
    });

    const businesses = memberships.map((m) => ({
      ...m.business,
      role: m.role,
    }));

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('Get businesses error:', error);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }
}

// Create new business
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

    // Check how many businesses user already owns
    const existingBusinesses = await prisma.businessMember.count({
      where: { userId: session.user.id, role: 'OWNER' },
    });

    // For now, use FREE plan limits for new businesses
    const limits = checkPlanLimits('FREE' as PlanType, { businesses: existingBusinesses });

    if (!limits.allowed) {
      return NextResponse.json({ error: limits.reason }, { status: 403 });
    }

    const { name, industry, currency, fiscalStartMonth, openingCashBalance, openingBankBalance } =
      validatedData.data;

    // Create business with default accounts, categories, and subscription
    const business = await prisma.business.create({
      data: {
        name,
        industry,
        currency,
        fiscalStartMonth: fiscalStartMonth || 1,
        // Create subscription
        subscription: {
          create: {
            plan: 'FREE',
            status: 'ACTIVE',
          },
        },
        // Add owner membership
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
        // Create default bank accounts
        bankAccounts: {
          create: [
            {
              name: 'Cash',
              type: 'CASH',
              currency,
              openingBalance: openingCashBalance || 0,
              currentBalance: openingCashBalance || 0,
            },
            {
              name: 'Bank Account',
              type: 'BANK',
              currency,
              openingBalance: openingBankBalance || 0,
              currentBalance: openingBankBalance || 0,
            },
          ],
        },
        // Create default categories
        categories: {
          create: DEFAULT_CATEGORIES.map((cat) => ({
            name: cat.name,
            type: cat.type,
            color: cat.color,
            isDefault: true,
          })),
        },
      },
      include: {
        subscription: true,
        bankAccounts: true,
        categories: true,
      },
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error('Create business error:', error);
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
  }
}
