'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Building2, CreditCard, Loader2, Save, Shield, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { CURRENCIES, INDUSTRIES } from '@/lib/utils';
import { PLANS } from '@/lib/stripe';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  const [profileData, setProfileData] = useState({ name: session?.user?.name || '' });
  const [businessData, setBusinessData] = useState({
    name: '',
    industry: '',
    currency: 'NGN',
    enableApprovals: false,
    budgetAlertThreshold: 80,
  });

  useEffect(() => {
    if (session?.user?.name) setProfileData({ name: session.user.name });
    fetchBusinessData();
  }, [session]);

  const fetchBusinessData = async () => {
    const businessId = localStorage.getItem('currentBusinessId');
    if (!businessId) return;

    try {
      const [bizRes, membersRes] = await Promise.all([
        fetch(`/api/businesses/${businessId}`),
        fetch(`/api/businesses/${businessId}/members`),
      ]);

      if (bizRes.ok) {
        const data = await bizRes.json();
        setBusiness(data.business);
        setSubscription(data.subscription);
        setBusinessData({
          name: data.business.name,
          industry: data.business.industry || '',
          currency: data.business.currency,
          enableApprovals: data.business.enableApprovals,
          budgetAlertThreshold: data.business.budgetAlertThreshold,
        });
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const saveProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      await update({ name: profileData.name });
      toast({ title: 'Profile updated', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveBusiness = async () => {
    setIsLoading(true);
    const businessId = localStorage.getItem('currentBusinessId');
    try {
      const response = await fetch(`/api/businesses/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessData),
      });
      if (!response.ok) throw new Error('Failed to update business');
      toast({ title: 'Business settings updated', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update settings', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const plan = subscription?.plan || 'FREE';
  const planConfig = PLANS[plan as keyof typeof PLANS];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and business settings</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
          <TabsTrigger value="business"><Building2 className="w-4 h-4 mr-2" />Business</TabsTrigger>
          <TabsTrigger value="team"><Users className="w-4 h-4 mr-2" />Team</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="w-4 h-4 mr-2" />Billing</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="mt-1 max-w-md" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={session?.user?.email || ''} disabled className="mt-1 max-w-md bg-gray-50" />
              </div>
              <Button onClick={saveProfile} disabled={isLoading}>{isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Save className="w-4 h-4 mr-2" />Save Changes</Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => signOut({ callbackUrl: '/' })}>Sign Out</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>Configure your business preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bizName">Business Name</Label>
                <Input id="bizName" value={businessData.name} onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })} className="mt-1 max-w-md" />
              </div>
              <div>
                <Label>Industry</Label>
                <Select value={businessData.industry} onValueChange={(v) => setBusinessData({ ...businessData, industry: v })}>
                  <SelectTrigger className="mt-1 max-w-md"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={businessData.currency} onValueChange={(v) => setBusinessData({ ...businessData, currency: v })}>
                  <SelectTrigger className="mt-1 max-w-md"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(cur => <SelectItem key={cur.code} value={cur.code}>{cur.symbol} {cur.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between max-w-md">
                <div>
                  <Label>Enable Approvals</Label>
                  <p className="text-sm text-gray-500">Require approval for staff transactions</p>
                </div>
                <Switch checked={businessData.enableApprovals} onCheckedChange={(v) => setBusinessData({ ...businessData, enableApprovals: v })} />
              </div>
              <div>
                <Label>Budget Alert Threshold</Label>
                <Select value={String(businessData.budgetAlertThreshold)} onValueChange={(v) => setBusinessData({ ...businessData, budgetAlertThreshold: parseInt(v) })}>
                  <SelectTrigger className="mt-1 max-w-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="100">100%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveBusiness} disabled={isLoading}>{isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Save className="w-4 h-4 mr-2" />Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage who has access to this business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-700 font-medium">{member.user.name?.[0] || 'U'}</span>
                      </div>
                      <div>
                        <p className="font-medium">{member.user.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{member.user.email}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium px-3 py-1 rounded-full bg-gray-100">{member.role}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-4" variant="outline"><Users className="w-4 h-4 mr-2" />Invite Team Member</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your billing and plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl mb-6">
                <div>
                  <p className="text-sm text-gray-500">Current Plan</p>
                  <p className="text-2xl font-bold text-green-700">{planConfig.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Monthly</p>
                  <p className="text-2xl font-bold">${planConfig.monthlyPrice}</p>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                {planConfig.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              {plan === 'FREE' && <Button>Upgrade to Pro</Button>}
              {plan !== 'FREE' && <Button variant="outline">Manage Subscription</Button>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
