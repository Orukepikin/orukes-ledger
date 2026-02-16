'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
  color: string | null;
  isDefault: boolean;
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryType, setCategoryType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formData, setFormData] = useState({ name: '', color: '#22C55E' });

  useEffect(() => { fetchCategories(); }, []);

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
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const businessId = localStorage.getItem('currentBusinessId');
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, name: formData.name, type: categoryType, color: formData.color }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      toast({ title: 'Category created', variant: 'success' });
      setShowAddModal(false);
      setFormData({ name: '', color: '#22C55E' });
      fetchCategories();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">Organize your income and expenses</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 mr-2" />Add Category</Button>
      </div>

      <Tabs defaultValue="expense">
        <TabsList><TabsTrigger value="expense">Expenses ({expenseCategories.length})</TabsTrigger><TabsTrigger value="income">Income ({incomeCategories.length})</TabsTrigger></TabsList>
        
        <TabsContent value="expense" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {expenseCategories.map(cat => (
              <Card key={cat.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-2" style={{ backgroundColor: cat.color || '#EF4444' }} />
                  <p className="font-medium text-sm truncate">{cat.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="income" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {incomeCategories.map(cat => (
              <Card key={cat.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-2" style={{ backgroundColor: cat.color || '#22C55E' }} />
                  <p className="font-medium text-sm truncate">{cat.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={categoryType} onValueChange={(v) => setCategoryType(v as 'INCOME' | 'EXPENSE')}>
              <TabsList className="w-full"><TabsTrigger value="EXPENSE" className="flex-1">Expense</TabsTrigger><TabsTrigger value="INCOME" className="flex-1">Income</TabsTrigger></TabsList>
            </Tabs>
            <div>
              <Label htmlFor="name">Category Name</Label>
              <Input id="name" placeholder="e.g., Office Supplies" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input id="color" type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="mt-1 h-10" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
