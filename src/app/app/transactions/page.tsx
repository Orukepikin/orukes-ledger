'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate, PAYMENT_METHODS } from '@/lib/utils';

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  date: string;
  paymentMethod: string;
  vendorName: string | null;
  customerName: string | null;
  description: string | null;
  status: string;
  category: { id: string; name: string; color: string } | null;
  account: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
}

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState('NGN');
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  
  // Filters - use "all" instead of empty string
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Add Transaction Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    accountId: '',
    toAccountId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'CASH',
    vendorName: '',
    customerName: '',
    description: '',
  });

  const fetchTransactions = useCallback(async () => {
    try {
      const businessId = localStorage.getItem('currentBusinessId');
      if (!businessId) return;

      const params = new URLSearchParams({
        businessId,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.set('search', searchQuery);
      // Only add filter if not "all"
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
      if (categoryFilter && categoryFilter !== 'all') params.set('categoryId', categoryFilter);

      const response = await fetch(`/api/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, typeFilter, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const businessId = localStorage.getItem('currentBusinessId');
      if (!businessId) return;

      const response = await fetch(`/api/categories?businessId=${businessId}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const businessId = localStorage.getItem('currentBusinessId');
      if (!businessId) return;

      const response = await fetch(`/api/accounts?businessId=${businessId}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
        setCurrency(data.currency || 'NGN');
        if (data.accounts.length > 0) {
          setFormData((prev) => ({ ...prev, accountId: data.accounts[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchAccounts();
  }, [fetchTransactions]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add-income') {
      setTransactionType('INCOME');
      setShowAddModal(true);
    } else if (action === 'add-expense') {
      setTransactionType('EXPENSE');
      setShowAddModal(true);
    } else if (action === 'add-transfer') {
      setTransactionType('TRANSFER');
      setShowAddModal(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const businessId = localStorage.getItem('currentBusinessId');
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          type: transactionType,
          amount: parseFloat(formData.amount),
          categoryId: formData.categoryId || null,
          accountId: formData.accountId,
          toAccountId: transactionType === 'TRANSFER' ? formData.toAccountId : null,
          date: formData.date,
          paymentMethod: formData.paymentMethod,
          vendorName: formData.vendorName || null,
          customerName: formData.customerName || null,
          description: formData.description || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({
        title: 'Transaction added',
        description: 'Your transaction has been recorded successfully.',
        variant: 'default',
      });

      setShowAddModal(false);
      resetForm();
      fetchTransactions();
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      categoryId: '',
      accountId: accounts[0]?.id || '',
      toAccountId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'CASH',
      vendorName: '',
      customerName: '',
      description: '',
    });
  };

  const filteredCategories = categories.filter((c) =>
    transactionType === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'
  );

  if (isLoading) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 mt-1">Track all your income and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => { setTransactionType('EXPENSE'); setShowAddModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardContent className="p-0">
          {transactions.length > 0 ? (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'INCOME'
                          ? 'bg-green-100'
                          : tx.type === 'EXPENSE'
                          ? 'bg-red-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {tx.type === 'INCOME' ? (
                        <ArrowUpRight className="w-5 h-5 text-green-600" />
                      ) : tx.type === 'EXPENSE' ? (
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      ) : (
                        <Wallet className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {tx.category?.name || (tx.type === 'TRANSFER' ? 'Transfer' : 'Uncategorized')}
                        </p>
                        {tx.status === 'PENDING' && (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {tx.description || tx.vendorName || tx.customerName || tx.account.name}
                        <span className="mx-1">•</span>
                        {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-lg font-semibold ${
                        tx.type === 'INCOME'
                          ? 'text-green-600'
                          : tx.type === 'EXPENSE'
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ArrowDownRight className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions yet</h3>
              <p className="text-gray-500 mb-4">Start tracking your money by adding your first transaction</p>
              <Button onClick={() => { setTransactionType('EXPENSE'); setShowAddModal(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {transactionType === 'INCOME' ? 'Income' : transactionType === 'EXPENSE' ? 'Expense' : 'Transfer'}
            </DialogTitle>
            <DialogDescription>Record a new transaction for your business</DialogDescription>
          </DialogHeader>

          <Tabs
            value={transactionType}
            onValueChange={(v) => setTransactionType(v as typeof transactionType)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="INCOME" className="text-green-600">Income</TabsTrigger>
              <TabsTrigger value="EXPENSE" className="text-red-600">Expense</TabsTrigger>
              <TabsTrigger value="TRANSFER" className="text-blue-600">Transfer</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            {transactionType !== 'TRANSFER' && filteredCategories.length > 0 && (
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, categoryId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select category</SelectItem>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {accounts.length > 0 && (
              <div>
                <Label htmlFor="account">
                  {transactionType === 'TRANSFER' ? 'From Account' : 'Account'}
                </Label>
                <Select
                  value={formData.accountId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, accountId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select account</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance, currency)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {transactionType === 'TRANSFER' && accounts.length > 1 && (
              <div>
                <Label htmlFor="toAccount">To Account</Label>
                <Select
                  value={formData.toAccountId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, toAccountId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select account</SelectItem>
                    {accounts
                      .filter((acc) => acc.id !== formData.accountId)
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.currentBalance, currency)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Add a note..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0 divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsSkeleton />}>
      <TransactionsContent />
    </Suspense>
  );
}
