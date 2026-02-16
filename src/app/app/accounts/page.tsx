'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Wallet, Building, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  type: string;
  openingBalance: number;
  currentBalance: number;
  isDefault: boolean;
}

export default function AccountsPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState('NGN');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'bank', openingBalance: '' });

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      const businessId = localStorage.getItem('currentBusinessId');
      if (!businessId) return;
      const response = await fetch(`/api/accounts?businessId=${businessId}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
        setCurrency(data.currency);
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
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, ...formData, openingBalance: parseFloat(formData.openingBalance) || 0 }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      toast({ title: 'Account created', variant: 'success' });
      setShowAddModal(false);
      setFormData({ name: '', type: 'bank', openingBalance: '' });
      fetchAccounts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500 mt-1">Manage your cash and bank accounts</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 mr-2" />Add Account</Button>
      </div>

      <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
        <CardContent className="p-6">
          <p className="text-green-100 mb-1">Total Balance</p>
          <p className="text-3xl font-bold">{formatCurrency(totalBalance, currency)}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${account.type === 'cash' ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {account.type === 'cash' ? <Wallet className="w-5 h-5 text-green-600" /> : <Building className="w-5 h-5 text-blue-600" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{account.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{account.type}</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(account.currentBalance, currency)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>Create a new cash or bank account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Account Name</Label>
              <Input id="name" placeholder="e.g., GTBank" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="type">Account Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="balance">Opening Balance</Label>
              <Input id="balance" type="number" placeholder="0" value={formData.openingBalance} onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })} className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
