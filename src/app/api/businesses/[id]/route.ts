import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { updateBusinessSchema } from '@/lib/validations';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const businessId = params.id;
    const membership = await prisma.businessMember.findFirst({ where: { userId: session.user.id, businessId } });
    if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { subscription: true },
    });

    if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ business, subscription: business.subscription });
  } catch (error) {
    console.error('Get business error:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const businessId = params.id;
    const membership = await prisma.businessMember.findFirst({ where: { userId: session.user.id, businessId } });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateBusinessSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.errors[0].message }, { status: 400 });
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
