'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  Download,
  PieChart,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCompactCurrency, calculatePercentage } from '@/lib/utils';

interface DashboardData {
  income: number;
  expenses: number;
  profit: number;
  cashBalance: number;
  budgetUsed: number;
  budgetTotal: number;
  currency: string;
  chartData: { date: string; income: number; expenses: number }[];
  categoryBreakdown: { name: string; value: number; color: string }[];
  budgetAlerts: { category: string; used: number; budget: number; percentage: number }[];
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    category: string;
    date: string;
    description: string;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'30' | '90'>('30');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      const businessId = localStorage.getItem('currentBusinessId');
      if (!businessId) return;

      const response = await fetch(`/api/dashboard?businessId=${businessId}&period=${period}`);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load dashboard data</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const profitPercentage = data.income > 0 ? ((data.profit / data.income) * 100).toFixed(1) : '0';
  const budgetPercentage = calculatePercentage(data.budgetUsed, data.budgetTotal);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s your financial overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/app/reports')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Income"
          value={formatCurrency(data.income, data.currency)}
          icon={TrendingUp}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Expenses"
          value={formatCurrency(data.expenses, data.currency)}
          icon={TrendingDown}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          title="Profit"
          value={formatCurrency(data.profit, data.currency)}
          icon={DollarSign}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          subtitle={`${profitPercentage}% margin`}
        />
        <StatCard
          title="Cash Balance"
          value={formatCurrency(data.cashBalance, data.currency)}
          icon={Wallet}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
      </div>

      {/* Budget Overview */}
      {data.budgetTotal > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Budget Overview</CardTitle>
              <Link href="/app/budgets">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Overall Budget</span>
                <span className="font-medium">
                  {formatCurrency(data.budgetUsed, data.currency)} / {formatCurrency(data.budgetTotal, data.currency)}
                </span>
              </div>
              <Progress
                value={budgetPercentage}
                className="h-2"
                indicatorClassName={
                  budgetPercentage > 90 ? 'bg-red-500' : budgetPercentage > 75 ? 'bg-amber-500' : 'bg-green-500'
                }
              />
              <p className="text-xs text-gray-500">{budgetPercentage}% used this month</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Alerts */}
      {data.budgetAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
              Budget Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.budgetAlerts.map((alert, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{alert.category}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(alert.used, data.currency)} of {formatCurrency(alert.budget, data.currency)}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${alert.percentage >= 100 ? 'text-red-600' : 'text-amber-600'}`}>
                    {alert.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Income vs Expenses</CardTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPeriod('30')}
                  className={`px-3 py-1 text-sm rounded-md ${period === '30' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  30 days
                </button>
                <button
                  onClick={() => setPeriod('90')}
                  className={`px-3 py-1 text-sm rounded-md ${period === '90' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  90 days
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactCurrency(v, data.currency)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value, data.currency)} contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Income" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Top Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={data.categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {data.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, data.currency)} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {data.categoryBreakdown.slice(0, 4).map((category, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="text-gray-600">{category.name}</span>
                  </div>
                  <span className="font-medium">{formatCompactCurrency(category.value, data.currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/app/transactions?action=add-income')}>
              <ArrowUpRight className="w-4 h-4 mr-2 text-green-500" />
              Add Income
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/app/transactions?action=add-expense')}>
              <ArrowDownRight className="w-4 h-4 mr-2 text-red-500" />
              Add Expense
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/app/transactions?action=add-transfer')}>
              <Wallet className="w-4 h-4 mr-2 text-blue-500" />
              Transfer Funds
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/app/budgets?action=create')}>
              <PieChart className="w-4 h-4 mr-2 text-purple-500" />
              Create Budget
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/app/reports')}>
              <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" />
              Export Report
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Recent Transactions</CardTitle>
              <Link href="/app/transactions">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentTransactions.length > 0 ? (
                data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {tx.type === 'INCOME' ? <ArrowUpRight className="w-5 h-5 text-green-600" /> : <ArrowDownRight className="w-5 h-5 text-red-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tx.category}</p>
                        <p className="text-sm text-gray-500">{tx.description || tx.date}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, data.currency)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No transactions yet</p>
                  <Button size="sm" className="mt-3" onClick={() => router.push('/app/transactions?action=add-income')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Transaction
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, iconBg, iconColor, subtitle }: StatCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
