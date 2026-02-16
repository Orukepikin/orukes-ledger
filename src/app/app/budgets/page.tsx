'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2, PieChart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, getMonthName } from '@/lib/utils';

interface Budget {
  id: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  category: { id: string; name: string; color: string } | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

export default function BudgetsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState('NGN');
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ categoryId: '', amount: '' });

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [month, year]);

  const fetchBudgets = async () => {
    try {
      const businessId = localStorage.getItem('currentBusinessId');
      if (!businessId) return;

      const response = await fetch(`/api/budgets?businessId=${businessId}&month=${month}&year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setBudgets(data.budgets);
        setCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const businessId = localStorage.getItem('currentBusinessId');
      if (!businessId) return;

      const response = await fetch(`/api/categories?businessId=${businessId}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories.filter((c: Category) => c.type === 'EXPENSE'));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const businessId = localStorage.getItem('currentBusinessId');
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          categoryId: formData.categoryId || null,
          amount: parseFloat(formData.amount),
          month,
          year,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({ title: 'Budget saved', description: 'Your budget has been updated.', variant: 'success' });
      setShowAddModal(false);
      setFormData({ categoryId: '', amount: '' });
      fetchBudgets();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (isLoading) {
    return <BudgetsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-500 mt-1">Track your spending against monthly limits</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Set Budget
        </Button>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">{getMonthName(month)} {year}</h2>
            <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overall Budget */}
      {totalBudget > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Overall Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{formatCurrency(totalSpent, currency)}</span>
                <span className="text-gray-500">of {formatCurrency(totalBudget, currency)}</span>
              </div>
              <Progress
                value={Math.min(overallPercentage, 100)}
                className="h-3"
                indicatorClassName={
                  overallPercentage > 100 ? 'bg-red-500' : overallPercentage > 80 ? 'bg-amber-500' : 'bg-green-500'
                }
              />
              <p className={`text-sm ${overallPercentage > 100 ? 'text-red-600' : overallPercentage > 80 ? 'text-amber-600' : 'text-gray-500'}`}>
                {overallPercentage}% used • {formatCurrency(totalBudget - totalSpent, currency)} remaining
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.length > 0 ? (
          budgets.map((budget) => (
            <Card key={budget.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.category?.color || '#6B7280' }} />
                    <span className="font-medium">{budget.category?.name || 'Overall'}</span>
                  </div>
                  <span className={`text-sm font-medium ${budget.percentage > 100 ? 'text-red-600' : budget.percentage > 80 ? 'text-amber-600' : 'text-green-600'}`}>
                    {budget.percentage}%
                  </span>
                </div>
                <Progress
                  value={Math.min(budget.percentage, 100)}
                  className="h-2 mb-2"
                  indicatorClassName={
                    budget.percentage > 100 ? 'bg-red-500' : budget.percentage > 80 ? 'bg-amber-500' : 'bg-green-500'
                  }
                />
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{formatCurrency(budget.spent, currency)} spent</span>
                  <span>{formatCurrency(budget.remaining, currency)} left</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center">
              <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No budgets set</h3>
              <p className="text-gray-500 mb-4">Create budgets to track your spending by category</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Set Your First Budget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Budget Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Budget</DialogTitle>
            <DialogDescription>Set a monthly spending limit for a category</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => !budgets.some((b) => b.category?.id === c.id))
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Budget Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Budget
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card><CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    </div>
  );
}
