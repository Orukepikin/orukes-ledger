# Orukes Ledger

A production-ready, multi-tenant financial management web application designed for Nigerian and African small businesses. Track income, expenses, budgets, and generate reports without any accounting knowledge.

## Features

### Core Features
- 📊 **Dashboard** - Real-time overview of income, expenses, profit, and cash balance
- 💰 **Transaction Management** - Track income, expenses, and transfers
- 📁 **Categories** - Organize transactions with customizable categories
- 💳 **Multiple Accounts** - Manage cash and bank accounts
- 📈 **Budgets** - Set monthly spending limits with alerts
- 📑 **Reports** - Generate P&L, cash flow, and category reports
- 📎 **Receipt Uploads** - Attach receipts to transactions
- 📤 **CSV Import/Export** - Bulk import transactions

### Business Features
- 👥 **Multi-tenant** - Create multiple business workspaces
- 🔐 **Role-based Access** - Owner, Admin, Staff, Viewer roles
- ✅ **Approval Workflows** - Optional transaction approvals
- 🔄 **Recurring Transactions** - Automate regular transactions
- 💳 **Subscription Billing** - Stripe-powered plans

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **UI**: TailwindCSS + shadcn/ui components
- **Auth**: NextAuth.js (credentials + OAuth)
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe subscriptions
- **Email**: Resend
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Stripe account (for payments)

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/orukes_ledger"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

### Demo Credentials

- **Email**: demo@orukesledger.com
- **Password**: demo123456

## Deployment

### Vercel

1. Push code to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

## License

MIT License
