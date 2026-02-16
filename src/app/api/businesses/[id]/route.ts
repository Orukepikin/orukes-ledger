import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { updateBusinessSchema } from '@/lib/validations';

// Get single business
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: businessId } = await params;

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        subscription: true,
        _count: {
          select: {
            members: true,
            transactions: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ business, role: membership.role });
  } catch (error) {
    console.error('Get business error:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}

// Update business
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: businessId } = await params;

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateBusinessSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data: validatedData.data,
    });

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Update business error:', error);
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
  }
}

// Delete business
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: businessId } = await params;

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, businessId },
    });

    if (!membership || membership.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owner can delete business' }, { status: 403 });
    }

    await prisma.business.delete({
      where: { id: businessId },
    });

    return NextResponse.json({ message: 'Business deleted' });
  } catch (error) {
    console.error('Delete business error:', error);
    return NextResponse.json({ error: 'Failed to delete business' }, { status: 500 });
  }
}
