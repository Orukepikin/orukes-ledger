import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  DollarSign,
  LineChart,
  PieChart,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: DollarSign,
    title: 'Track Income & Expenses',
    description:
      'Record every naira coming in and going out. Know exactly where your money goes.',
  },
  {
    icon: PieChart,
    title: 'Budget Management',
    description:
      'Set monthly budgets by category and get alerts before you overspend.',
  },
  {
    icon: LineChart,
    title: 'Beautiful Reports',
    description:
      'See your profit, cash flow, and spending patterns at a glance with easy charts.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Invite your team with different access levels. Everyone stays on the same page.',
  },
  {
    icon: Smartphone,
    title: 'Works on Phone',
    description:
      'Designed mobile-first. Track transactions on the go from any device.',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description:
      'Your financial data is encrypted and secure. We take privacy seriously.',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '₦0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '1 business workspace',
      '1 user',
      '100 transactions/month',
      'Basic reports',
      'CSV export',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$15',
    period: '/month',
    description: 'For growing businesses',
    features: [
      '1 business workspace',
      'Up to 5 team members',
      'Unlimited transactions',
      'All reports & charts',
      'Receipt uploads',
      'Email support',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '$30',
    period: '/month',
    description: 'For multiple businesses',
    features: [
      'Up to 3 businesses',
      'Up to 15 team members',
      'Everything in Pro',
      'Approval workflows',
      'Recurring transactions',
      'Priority support',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const testimonials = [
  {
    quote:
      "Finally, an app that speaks my language! I don't need to understand accounting to know if my business is making money.",
    author: 'Mama Ngozi',
    role: 'Fashion Retailer, Lagos',
  },
  {
    quote:
      'The budget alerts saved me from overspending twice this month. This app pays for itself.',
    author: 'Chukwudi Okonkwo',
    role: 'Restaurant Owner, Abuja',
  },
  {
    quote:
      "I can finally see my profit clearly. No more guessing if we're doing well or not.",
    author: 'Amina Bello',
    role: 'Beauty Salon Owner, Kano',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">₦</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Orukes Ledger
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Testimonials
              </a>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Start Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Built for African Small Businesses
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Know Your Numbers.
              <br />
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Grow Your Business.
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              The simplest way to track income, expenses, and profit. No
              accounting degree required. Just clarity about your money.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="text-lg px-8 py-6">
                  Start Free Today
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a
                href="https://wa.me/2341234567890?text=I%20want%20a%20demo%20of%20Orukes%20Ledger"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  Book a Demo
                </Button>
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Free forever for small businesses. No credit card required.
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-50 to-transparent z-10 pointer-events-none h-32 bottom-0 top-auto" />
            <div className="rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-white">
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Income', value: '₦2,450,000', color: 'green', icon: TrendingUp },
                    { label: 'Expenses', value: '₦1,890,000', color: 'red', icon: CreditCard },
                    { label: 'Profit', value: '₦560,000', color: 'emerald', icon: BarChart3 },
                    { label: 'Cash Balance', value: '₦1,250,000', color: 'blue', icon: DollarSign },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">{stat.label}</span>
                        <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="h-48 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl flex items-center justify-center">
                  <LineChart className="w-16 h-16 text-green-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Stay on Top
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple tools that give you clarity about your business finances
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free, upgrade when you need more
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-xl scale-105'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <h3
                  className={`text-xl font-semibold mb-2 ${
                    plan.highlighted ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mb-4 ${
                    plan.highlighted ? 'text-green-100' : 'text-gray-500'
                  }`}
                >
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span
                    className={`text-4xl font-bold ${
                      plan.highlighted ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={
                      plan.highlighted ? 'text-green-100' : 'text-gray-500'
                    }
                  >
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-5 h-5 ${
                          plan.highlighted ? 'text-green-200' : 'text-green-500'
                        }`}
                      />
                      <span
                        className={
                          plan.highlighted ? 'text-white' : 'text-gray-600'
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup">
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? 'bg-white text-green-600 hover:bg-green-50'
                        : ''
                    }`}
                    variant={plan.highlighted ? 'secondary' : 'default'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Loved by Business Owners
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what other entrepreneurs are saying
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <p className="text-gray-700 mb-4 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-gray-900">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-600 to-emerald-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of African businesses tracking their money with
            clarity and confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-white text-green-600 hover:bg-green-50 text-lg px-8 py-6"
              >
                Start Free Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">₦</span>
              </div>
              <span className="text-xl font-bold text-white">Orukes Ledger</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Support
              </a>
            </div>
            <p className="text-gray-500">
              © {new Date().getFullYear()} Orukes Ledger. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
