'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  BarChart3,
  Building2,
  ChevronDown,
  CreditCard,
  FolderKanban,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Plus,
  Receipt,
  Settings,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/app/transactions', icon: Receipt },
  { name: 'Budgets', href: '/app/budgets', icon: PieChart },
  { name: 'Accounts', href: '/app/accounts', icon: Wallet },
  { name: 'Categories', href: '/app/categories', icon: FolderKanban },
  { name: 'Reports', href: '/app/reports', icon: BarChart3 },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

interface Business {
  id: string;
  name: string;
  currency: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchBusinesses();
    }
  }, [session]);

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses');
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data.businesses);
        if (data.businesses.length > 0) {
          // Get saved business from localStorage or use first one
          const savedBusinessId = localStorage.getItem('currentBusinessId');
          const business = savedBusinessId
            ? data.businesses.find((b: Business) => b.id === savedBusinessId) || data.businesses[0]
            : data.businesses[0];
          setCurrentBusiness(business);
          localStorage.setItem('currentBusinessId', business.id);
        }
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  const switchBusiness = (business: Business) => {
    setCurrentBusiness(business);
    localStorage.setItem('currentBusinessId', business.id);
    router.refresh();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">₦</span>
          </div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  // Check if user needs to create a business
  const needsOnboarding = !isLoadingBusinesses && businesses.length === 0;

  if (needsOnboarding && pathname !== '/app/onboarding') {
    router.push('/app/onboarding');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:transform-none lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <Link href="/app/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">₦</span>
              </div>
              <span className="text-lg font-bold text-gray-900">Orukes</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Business Switcher */}
          <div className="p-4 border-b border-gray-100">
            {isLoadingBusinesses ? (
              <Skeleton className="h-10 w-full" />
            ) : currentBusiness ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="truncate">{currentBusiness.name}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Your Businesses</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {businesses.map((business) => (
                    <DropdownMenuItem
                      key={business.id}
                      onClick={() => switchBusiness(business)}
                      className={cn(
                        'cursor-pointer',
                        currentBusiness.id === business.id && 'bg-green-50'
                      )}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      {business.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push('/app/onboarding')}
                    className="cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Business
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/app/onboarding')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Business
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={cn('w-5 h-5', isActive ? 'text-green-600' : 'text-gray-400')}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {getInitials(session?.user?.name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session?.user?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => router.push('/app/settings')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/app/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              {/* Quick Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Quick Add
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/app/transactions?action=add-income')}>
                    <CreditCard className="w-4 h-4 mr-2 text-green-500" />
                    Add Income
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/app/transactions?action=add-expense')}>
                    <CreditCard className="w-4 h-4 mr-2 text-red-500" />
                    Add Expense
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/app/transactions?action=add-transfer')}>
                    <Wallet className="w-4 h-4 mr-2 text-blue-500" />
                    Transfer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/app/budgets?action=create')}>
                    <PieChart className="w-4 h-4 mr-2" />
                    Create Budget
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
