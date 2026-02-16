import { PrismaClient, CategoryType, TransactionType, PaymentMethod, Role, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, subDays, startOfMonth, format } from 'date-fns';

const prisma = new PrismaClient();

const defaultExpenseCategories = [
  { name: 'Rent', icon: 'Home', color: '#EF4444' },
  { name: 'Salaries', icon: 'Users', color: '#F97316' },
  { name: 'Transport', icon: 'Car', color: '#F59E0B' },
  { name: 'Data/Internet', icon: 'Wifi', color: '#EAB308' },
  { name: 'Marketing', icon: 'Megaphone', color: '#84CC16' },
  { name: 'Utilities', icon: 'Zap', color: '#22C55E' },
  { name: 'Inventory', icon: 'Package', color: '#14B8A6' },
  { name: 'Maintenance', icon: 'Wrench', color: '#06B6D4' },
  { name: 'Taxes', icon: 'Receipt', color: '#0EA5E9' },
  { name: 'Feeding', icon: 'UtensilsCrossed', color: '#3B82F6' },
  { name: 'Miscellaneous', icon: 'MoreHorizontal', color: '#6366F1' },
];

const defaultIncomeCategories = [
  { name: 'Sales', icon: 'ShoppingCart', color: '#22C55E' },
  { name: 'Services', icon: 'Briefcase', color: '#10B981' },
  { name: 'Grants', icon: 'Gift', color: '#14B8A6' },
  { name: 'Investments', icon: 'TrendingUp', color: '#06B6D4' },
  { name: 'Other Income', icon: 'Plus', color: '#0EA5E9' },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123456', 12);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@orukesledger.com' },
    update: {},
    create: {
      email: 'demo@orukesledger.com',
      name: 'Demo User',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Create demo business
  const demoBusiness = await prisma.business.upsert({
    where: { id: 'demo-business-001' },
    update: {},
    create: {
      id: 'demo-business-001',
      name: 'Mama Nkechi Fashion House',
      industry: 'Retail & Fashion',
      currency: 'NGN',
      fiscalStartMonth: 1,
      enableApprovals: false,
      budgetAlertThreshold: 80,
    },
  });

  console.log('✅ Demo business created:', demoBusiness.name);

  // Create business membership
  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId: demoUser.id,
        businessId: demoBusiness.id,
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      businessId: demoBusiness.id,
      role: Role.OWNER,
    },
  });

  console.log('✅ Business membership created');

  // Create subscription
  await prisma.subscription.upsert({
    where: { businessId: demoBusiness.id },
    update: {},
    create: {
      businessId: demoBusiness.id,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 30),
    },
  });

  console.log('✅ Subscription created');

  // Create bank accounts
  const cashAccount = await prisma.bankAccount.upsert({
    where: { id: 'demo-cash-account' },
    update: {},
    create: {
      id: 'demo-cash-account',
      businessId: demoBusiness.id,
      name: 'Cash',
      type: 'cash',
      openingBalance: 150000,
      currentBalance: 150000,
      isDefault: true,
    },
  });

  const bankAccount = await prisma.bankAccount.upsert({
    where: { id: 'demo-bank-account' },
    update: {},
    create: {
      id: 'demo-bank-account',
      businessId: demoBusiness.id,
      name: 'GTBank',
      type: 'bank',
      openingBalance: 500000,
      currentBalance: 500000,
      isDefault: false,
    },
  });

  console.log('✅ Bank accounts created');

  // Create categories
  const expenseCategories = await Promise.all(
    defaultExpenseCategories.map((cat) =>
      prisma.category.upsert({
        where: {
          businessId_name_type: {
            businessId: demoBusiness.id,
            name: cat.name,
            type: CategoryType.EXPENSE,
          },
        },
        update: {},
        create: {
          businessId: demoBusiness.id,
          name: cat.name,
          type: CategoryType.EXPENSE,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
        },
      })
    )
  );

  const incomeCategories = await Promise.all(
    defaultIncomeCategories.map((cat) =>
      prisma.category.upsert({
        where: {
          businessId_name_type: {
            businessId: demoBusiness.id,
            name: cat.name,
            type: CategoryType.INCOME,
          },
        },
        update: {},
        create: {
          businessId: demoBusiness.id,
          name: cat.name,
          type: CategoryType.INCOME,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
        },
      })
    )
  );

  console.log('✅ Categories created');

  // Create budgets for current month
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const budgetData = [
    { category: 'Rent', amount: 150000 },
    { category: 'Salaries', amount: 300000 },
    { category: 'Transport', amount: 50000 },
    { category: 'Marketing', amount: 80000 },
    { category: 'Inventory', amount: 200000 },
    { category: 'Utilities', amount: 30000 },
    { category: 'Data/Internet', amount: 25000 },
    { category: 'Feeding', amount: 40000 },
  ];

  for (const budget of budgetData) {
    const category = expenseCategories.find((c) => c.name === budget.category);
    if (category) {
      await prisma.budget.upsert({
        where: {
          businessId_categoryId_month_year: {
            businessId: demoBusiness.id,
            categoryId: category.id,
            month: currentMonth,
            year: currentYear,
          },
        },
        update: {},
        create: {
          businessId: demoBusiness.id,
          categoryId: category.id,
          amount: budget.amount,
          month: currentMonth,
          year: currentYear,
          carryOver: false,
        },
      });
    }
  }

  console.log('✅ Budgets created');

  // Create demo transactions
  const salesCategory = incomeCategories.find((c) => c.name === 'Sales');
  const servicesCategory = incomeCategories.find((c) => c.name === 'Services');
  const rentCategory = expenseCategories.find((c) => c.name === 'Rent');
  const salariesCategory = expenseCategories.find((c) => c.name === 'Salaries');
  const transportCategory = expenseCategories.find((c) => c.name === 'Transport');
  const marketingCategory = expenseCategories.find((c) => c.name === 'Marketing');
  const inventoryCategory = expenseCategories.find((c) => c.name === 'Inventory');
  const utilitiesCategory = expenseCategories.find((c) => c.name === 'Utilities');
  const dataCategory = expenseCategories.find((c) => c.name === 'Data/Internet');
  const feedingCategory = expenseCategories.find((c) => c.name === 'Feeding');

  const customers = ['Mrs. Adaeze', 'Chief Okonkwo', 'Alhaji Musa', 'Pastor David', 'Dr. Chioma', 'Madam Rose'];
  const vendors = ['Balogun Market', 'Ariaria Fabric', 'PHCN', 'MTN', 'Mobil Fuel Station', 'Shoprite'];

  // Generate 60 demo transactions over the last 60 days
  const transactions = [];
  
  for (let i = 0; i < 60; i++) {
    const date = subDays(new Date(), Math.floor(Math.random() * 60));
    
    // Income transactions (Sales)
    if (i % 2 === 0) {
      transactions.push({
        businessId: demoBusiness.id,
        accountId: Math.random() > 0.3 ? bankAccount.id : cashAccount.id,
        categoryId: Math.random() > 0.2 ? salesCategory!.id : servicesCategory!.id,
        userId: demoUser.id,
        type: TransactionType.INCOME,
        amount: Math.round((Math.random() * 150000 + 10000) / 1000) * 1000,
        date,
        paymentMethod: Math.random() > 0.5 ? PaymentMethod.BANK_TRANSFER : PaymentMethod.CASH,
        customerName: customers[Math.floor(Math.random() * customers.length)],
        description: `Sale of ${['Ankara fabric', 'Lace material', 'Ready-made dress', 'Accessories', 'Tailoring service'][Math.floor(Math.random() * 5)]}`,
        tags: ['sales'],
      });
    }
    
    // Expense transactions
    const expenseTypes = [
      { category: transportCategory, min: 2000, max: 15000, desc: 'Transport to' },
      { category: marketingCategory, min: 5000, max: 50000, desc: 'Marketing -' },
      { category: inventoryCategory, min: 20000, max: 100000, desc: 'Stock purchase from' },
      { category: utilitiesCategory, min: 5000, max: 25000, desc: 'Electricity bill' },
      { category: dataCategory, min: 3000, max: 15000, desc: 'Internet subscription' },
      { category: feedingCategory, min: 1000, max: 8000, desc: 'Lunch/refreshments' },
    ];

    const expense = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
    
    transactions.push({
      businessId: demoBusiness.id,
      accountId: Math.random() > 0.5 ? cashAccount.id : bankAccount.id,
      categoryId: expense.category!.id,
      userId: demoUser.id,
      type: TransactionType.EXPENSE,
      amount: Math.round((Math.random() * (expense.max - expense.min) + expense.min) / 100) * 100,
      date,
      paymentMethod: Math.random() > 0.6 ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER,
      vendorName: vendors[Math.floor(Math.random() * vendors.length)],
      description: `${expense.desc} ${['Lagos', 'Aba', 'Onitsha', 'shop'][Math.floor(Math.random() * 4)]}`,
      tags: ['expense'],
    });
  }

  // Add fixed monthly expenses
  const monthStart = startOfMonth(new Date());
  
  // Rent
  transactions.push({
    businessId: demoBusiness.id,
    accountId: bankAccount.id,
    categoryId: rentCategory!.id,
    userId: demoUser.id,
    type: TransactionType.EXPENSE,
    amount: 120000,
    date: monthStart,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    vendorName: 'Landlord - Mr. Eze',
    description: 'Monthly shop rent',
    tags: ['rent', 'fixed'],
  });

  // Salaries
  transactions.push({
    businessId: demoBusiness.id,
    accountId: bankAccount.id,
    categoryId: salariesCategory!.id,
    userId: demoUser.id,
    type: TransactionType.EXPENSE,
    amount: 250000,
    date: addDays(monthStart, 27),
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    vendorName: 'Staff Salaries',
    description: 'Monthly salaries for 3 staff',
    tags: ['salaries', 'payroll'],
  });

  // Delete existing transactions and create new ones
  await prisma.transaction.deleteMany({
    where: { businessId: demoBusiness.id },
  });

  await prisma.transaction.createMany({
    data: transactions,
  });

  console.log(`✅ ${transactions.length} demo transactions created`);

  // Update account balances
  const incomeTotal = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenseTotal = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  // Simple balance update (in reality would need to track per account)
  await prisma.bankAccount.update({
    where: { id: bankAccount.id },
    data: { currentBalance: 500000 + (incomeTotal * 0.7) - (expenseTotal * 0.5) },
  });

  await prisma.bankAccount.update({
    where: { id: cashAccount.id },
    data: { currentBalance: 150000 + (incomeTotal * 0.3) - (expenseTotal * 0.5) },
  });

  console.log('✅ Account balances updated');
  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📧 Demo Login:');
  console.log('   Email: demo@orukesledger.com');
  console.log('   Password: demo123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
