'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { CURRENCIES, INDUSTRIES } from '@/lib/utils';

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    currency: 'NGN',
    fiscalStartMonth: 1,
    openingCashBalance: 0,
    openingBankBalance: 0,
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const data = await response.json();
      localStorage.setItem('currentBusinessId', data.business.id);

      toast({
        title: 'Business created!',
        description: 'Your business workspace is ready.',
      });

      router.push('/app/dashboard');
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">₦</span>
          </div>
          <CardTitle className="text-2xl">Create Your Business</CardTitle>
          <CardDescription>
            {step === 1 ? 'Tell us about your business' : 'Set your opening balances'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Mama Ngozi Fashion House"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(v) => setFormData({ ...formData, industry: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name} ({curr.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => setStep(2)}
                disabled={!formData.name}
              >
                Continue
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">
                Enter your current balances to start tracking accurately. You can skip this step and add them later.
              </p>

              <div>
                <Label htmlFor="cashBalance">Cash on Hand</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="cashBalance"
                    type="number"
                    placeholder="0"
                    value={formData.openingCashBalance || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, openingCashBalance: parseFloat(e.target.value) || 0 })
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bankBalance">Bank Balance</Label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="bankBalance"
                    type="number"
                    placeholder="0"
                    value={formData.openingBankBalance || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, openingBankBalance: parseFloat(e.target.value) || 0 })
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Business
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-6">
            <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}