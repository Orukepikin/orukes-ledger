import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const period = searchParams.get('period') || '30';

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

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const now = new Date();
    const daysAgo = parseInt(period);
    const startDate = subDays(now, daysAgo);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        businessId,
        date: { gte: startDate, lte: now },
        status: 'APPROVED',
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    // Calculate totals for current month
    const monthlyTransactions = transactions.filter(
      (t) => t.date >= monthStart && t.date <= monthEnd
    );

    const income = monthlyTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const profit = income - expenses;

    // Get account balances
    const accounts = await prisma.bankAccount.findMany({
      where: { businessId },
    });

    const cashBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    // Get budgets for current month
    const budgets = await prisma.budget.findMany({
      where: {
        businessId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      include: { category: true },
    });

    // Calculate budget usage
    const budgetTotal = budgets.reduce((sum, b) => sum + b.amount, 0);
    let budgetUsed = 0;
    const budgetAlerts: { category: string; used: number; budget: number; percentage: number }[] = [];

    for (const budget of budgets) {
      const categoryExpenses = monthlyTransactions
        .filter((t) => t.type === 'EXPENSE' && t.categoryId === budget.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);

      budgetUsed += categoryExpenses;

      const percentage = Math.round((categoryExpenses / budget.amount) * 100);
      if (percentage >= business.budgetAlertThreshold) {
        budgetAlerts.push({
          category: budget.category?.name || 'Overall',
          used: categoryExpenses,
          budget: budget.amount,
          percentage,
        });
      }
    }

    // Generate chart data (daily aggregates)
    const chartData: { date: string; income: number; expenses: number }[] = [];
    const dateMap = new Map<string, { income: number; expenses: number }>();

    for (let i = 0; i < daysAgo; i += Math.ceil(daysAgo / 15)) {
      const date = subDays(now, daysAgo - i);
      const dateStr = format(date, 'MMM dd');
      dateMap.set(dateStr, { income: 0, expenses: 0 });
    }

    transactions.forEach((t) => {
      const dateStr = format(t.date, 'MMM dd');
      const existing = dateMap.get(dateStr) || { income: 0, expenses: 0 };
      if (t.type === 'INCOME') {
        existing.income += t.amount;
      } else if (t.type === 'EXPENSE') {
        existing.expenses += t.amount;
      }
      dateMap.set(dateStr, existing);
    });

    dateMap.forEach((value, key) => {
      chartData.push({ date: key, ...value });
    });

    // Get category breakdown for expenses
    const categoryTotals = new Map<string, { name: string; value: number; color: string }>();
    monthlyTransactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        const categoryName = t.category?.name || 'Uncategorized';
        const color = t.category?.color || '#6B7280';
        const existing = categoryTotals.get(categoryName);
        if (existing) {
          existing.value += t.amount;
        } else {
          categoryTotals.set(categoryName, { name: categoryName, value: t.amount, color });
        }
      });

    const categoryBreakdown = Array.from(categoryTotals.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Get recent transactions
    const recentTransactions = transactions.slice(0, 5).map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      category: t.category?.name || 'Uncategorized',
      date: format(t.date, 'MMM dd, yyyy'),
      description: t.description || '',
    }));

    return NextResponse.json({
      income,
      expenses,
      profit,
      cashBalance,
      budgetUsed,
      budgetTotal,
      currency: business.currency,
      chartData,
      categoryBreakdown,
      budgetAlerts,
      recentTransactions,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
