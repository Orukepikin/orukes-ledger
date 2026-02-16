import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { createAccountSchema } from '@/lib/validations';

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

    const accounts = await prisma.bankAccount.findMany({
      where: { businessId },
      orderBy: { isDefault: 'desc' },
    });

    return NextResponse.json({ accounts, currency: business?.currency || 'NGN' });
  } catch (error) {
    console.error('Get accounts error:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, ...accountData } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const validatedData = createAccountSchema.safeParse(accountData);
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.errors[0].message }, { status: 400 });
    }

    const account = await prisma.bankAccount.create({
      data: {
        businessId,
        name: validatedData.data.name,
        type: validatedData.data.type,
        openingBalance: validatedData.data.openingBalance,
        currentBalance: validatedData.data.openingBalance,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
