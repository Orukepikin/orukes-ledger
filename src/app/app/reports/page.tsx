'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Download, FileText, PieChart, TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCompactCurrency, getMonthName } from '@/lib/utils';

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState('NGN');
  const [period, setPeriod] = useState('this-month');
  const [data, setData] = useState<any>(null);

  useEffect(() => { fetchReportData(); }, [period]);

  const fetchReportData = async () => {
    try {
      const businessId = localStorage.getItem('currentBusinessId');
      if (!businessId) return;
      const response = await fetch(`/api/reports?businessId=${businessId}&period=${period}`);
      if (response.ok) {
        const reportData = await response.json();
        setData(reportData);
        setCurrency(reportData.currency);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!data) return;
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Description'];
    const rows = data.transactions?.map((t: any) => [t.date, t.type, t.category, t.amount, t.description]) || [];
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${period}.csv`;
    a.click();
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Analyze your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadCSV}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-xl font-bold">{formatCurrency(data?.income || 0, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-xl font-bold">{formatCurrency(data?.expenses || 0, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><FileText className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Net Profit</p>
                <p className="text-xl font-bold">{formatCurrency(data?.profit || 0, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><PieChart className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-xl font-bold">{data?.transactionCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Income vs Expenses Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCompactCurrency(v, currency)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={data?.categoryBreakdown || []} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                    {(data?.categoryBreakdown || []).map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(data?.categoryBreakdown || []).slice(0, 6).map((cat: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="truncate">{cat.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors/Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Vendors (Expenses)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.topVendors || []).map((v: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-600">{v.name}</span>
                  <span className="font-medium">{formatCurrency(v.amount, currency)}</span>
                </div>
              ))}
              {(!data?.topVendors || data.topVendors.length === 0) && <p className="text-gray-500 text-center py-4">No vendor data</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Customers (Income)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.topCustomers || []).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-600">{c.name}</span>
                  <span className="font-medium text-green-600">{formatCurrency(c.amount, currency)}</span>
                </div>
              ))}
              {(!data?.topCustomers || data.topCustomers.length === 0) && <p className="text-gray-500 text-center py-4">No customer data</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
