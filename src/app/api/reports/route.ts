import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, subDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const period = searchParams.get('period') || 'this-month';

    if (!businessId) return NextResponse.json({ error: 'Business ID required' }, { status: 400 });

    const membership = await prisma.businessMember.findFirst({ where: { userId: session.user.id, businessId } });
    if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const business = await prisma.business.findUnique({ where: { id: businessId } });

    // Calculate date range
    const now = new Date();
    let startDate: Date, endDate: Date;
    switch (period) {
      case 'last-month':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'this-quarter':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case 'this-year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    const transactions = await prisma.transaction.findMany({
      where: { businessId, status: 'APPROVED', date: { gte: startDate, lte: endDate } },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const profit = income - expenses;

    // Chart data (daily aggregates)
    const chartMap = new Map<string, { income: number; expenses: number }>();
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const step = Math.max(1, Math.floor(daysDiff / 15));
    
    for (let i = 0; i <= daysDiff; i += step) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      chartMap.set(format(date, 'MMM dd'), { income: 0, expenses: 0 });
    }

    transactions.forEach(t => {
      const dateStr = format(t.date, 'MMM dd');
      const existing = chartMap.get(dateStr);
      if (existing) {
        if (t.type === 'INCOME') existing.income += t.amount;
        else if (t.type === 'EXPENSE') existing.expenses += t.amount;
      }
    });

    const chartData = Array.from(chartMap.entries()).map(([date, data]) => ({ date, ...data }));

    // Category breakdown
    const categoryTotals = new Map<string, { name: string; value: number; color: string }>();
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      const name = t.category?.name || 'Uncategorized';
      const color = t.category?.color || '#6B7280';
      const existing = categoryTotals.get(name);
      if (existing) existing.value += t.amount;
      else categoryTotals.set(name, { name, value: t.amount, color });
    });
    const categoryBreakdown = Array.from(categoryTotals.values()).sort((a, b) => b.value - a.value).slice(0, 8);

    // Top vendors and customers
    const vendorTotals = new Map<string, number>();
    const customerTotals = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'EXPENSE' && t.vendorName) {
        vendorTotals.set(t.vendorName, (vendorTotals.get(t.vendorName) || 0) + t.amount);
      }
      if (t.type === 'INCOME' && t.customerName) {
        customerTotals.set(t.customerName, (customerTotals.get(t.customerName) || 0) + t.amount);
      }
    });

    const topVendors = Array.from(vendorTotals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topCustomers = Array.from(customerTotals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return NextResponse.json({
      income,
      expenses,
      profit,
      transactionCount: transactions.length,
      currency: business?.currency || 'NGN',
      chartData,
      categoryBreakdown,
      topVendors,
      topCustomers,
      transactions: transactions.map(t => ({
        date: format(t.date, 'yyyy-MM-dd'),
        type: t.type,
        category: t.category?.name || 'Uncategorized',
        amount: t.amount,
        description: t.description || '',
      })),
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}
