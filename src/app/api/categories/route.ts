import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { createCategorySchema } from '@/lib/validations';

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

    const categories = await prisma.category.findMany({
      where: { businessId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, ...categoryData } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const validatedData = createCategorySchema.safeParse(categoryData);
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.errors[0].message }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: {
        businessId,
        name: validatedData.data.name,
        type: validatedData.data.type,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        businessId,
        ...validatedData.data,
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
