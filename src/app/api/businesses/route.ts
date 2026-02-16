import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { createBusinessSchema } from '@/lib/validations';

// Get user's businesses
export async function GET() {
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
          },
        },
      },
    });

    const businesses = memberships.map((m) => ({
      id: m.business.id,
      name: m.business.name,
      industry: m.business.industry,
      currency: m.business.currency,
      role: m.role,
      plan: m.business.subscription?.plan || 'FREE',
    }));

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('Get businesses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

// Create a new business
export async function POST(request: Request) {
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

    const {
      name,
      industry,
      currency,
      fiscalStartMonth,
      openingCashBalance,
      openingBankBalance,
    } = validatedData.data;

    // Check plan limits
    const existingBusinesses = await prisma.businessMember.count({
      where: { userId: session.user.id, role: 'OWNER' },
    });

    // For simplicity, allow up to 3 businesses on free plan
    if (existingBusinesses >= 3) {
      return NextResponse.json(
        { error: 'You have reached the maximum number of businesses' },
        { status: 400 }
      );
    }

    // Create business with default data
    const business = await prisma.business.create({
      data: {
        name,
        industry,
        currency,
        fiscalStartMonth,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
        subscription: {
          create: {
            plan: 'FREE',
            status: 'ACTIVE',
          },
        },
        bankAccounts: {
          create: [
            {
              name: 'Cash',
              type: 'cash',
              openingBalance: openingCashBalance,
              currentBalance: openingCashBalance,
              isDefault: true,
            },
            {
              name: 'Bank',
              type: 'bank',
              openingBalance: openingBankBalance,
              currentBalance: openingBankBalance,
              isDefault: false,
            },
          ],
        },
        categories: {
          create: [
            // Expense categories
            { name: 'Rent', type: 'EXPENSE', icon: 'Home', color: '#EF4444', isDefault: true },
            { name: 'Salaries', type: 'EXPENSE', icon: 'Users', color: '#F97316', isDefault: true },
            { name: 'Transport', type: 'EXPENSE', icon: 'Car', color: '#F59E0B', isDefault: true },
            { name: 'Data/Internet', type: 'EXPENSE', icon: 'Wifi', color: '#EAB308', isDefault: true },
            { name: 'Marketing', type: 'EXPENSE', icon: 'Megaphone', color: '#84CC16', isDefault: true },
            { name: 'Utilities', type: 'EXPENSE', icon: 'Zap', color: '#22C55E', isDefault: true },
            { name: 'Inventory', type: 'EXPENSE', icon: 'Package', color: '#14B8A6', isDefault: true },
            { name: 'Maintenance', type: 'EXPENSE', icon: 'Wrench', color: '#06B6D4', isDefault: true },
            { name: 'Taxes', type: 'EXPENSE', icon: 'Receipt', color: '#0EA5E9', isDefault: true },
            { name: 'Feeding', type: 'EXPENSE', icon: 'UtensilsCrossed', color: '#3B82F6', isDefault: true },
            { name: 'Miscellaneous', type: 'EXPENSE', icon: 'MoreHorizontal', color: '#6366F1', isDefault: true },
            // Income categories
            { name: 'Sales', type: 'INCOME', icon: 'ShoppingCart', color: '#22C55E', isDefault: true },
            { name: 'Services', type: 'INCOME', icon: 'Briefcase', color: '#10B981', isDefault: true },
            { name: 'Grants', type: 'INCOME', icon: 'Gift', color: '#14B8A6', isDefault: true },
            { name: 'Investments', type: 'INCOME', icon: 'TrendingUp', color: '#06B6D4', isDefault: true },
            { name: 'Other Income', type: 'INCOME', icon: 'Plus', color: '#0EA5E9', isDefault: true },
          ],
        },
      },
      include: {
        subscription: true,
      },
    });

    return NextResponse.json({
      message: 'Business created successfully',
      business: {
        id: business.id,
        name: business.name,
        currency: business.currency,
        plan: business.subscription?.plan || 'FREE',
      },
    });
  } catch (error) {
    console.error('Create business error:', error);
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}
