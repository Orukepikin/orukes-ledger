import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '@/styles/globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: {
    default: 'Orukes Ledger - Simple Business Finance Tracker',
    template: '%s | Orukes Ledger',
  },
  description:
    'The simplest way for African small businesses to track income, expenses, budgets, and profits. No accounting knowledge required.',
  keywords: [
    'business finance',
    'expense tracker',
    'income tracker',
    'budgeting',
    'small business',
    'Nigeria',
    'Africa',
    'SME',
    'accounting',
  ],
  authors: [{ name: 'Orukes Ledger' }],
  creator: 'Orukes Ledger',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://orukesledger.com',
    title: 'Orukes Ledger - Simple Business Finance Tracker',
    description:
      'The simplest way for African small businesses to track income, expenses, budgets, and profits.',
    siteName: 'Orukes Ledger',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orukes Ledger - Simple Business Finance Tracker',
    description:
      'The simplest way for African small businesses to track income, expenses, budgets, and profits.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
