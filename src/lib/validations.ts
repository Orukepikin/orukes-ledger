import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  industry: z.string().optional(),
  currency: z.string().default('NGN'),
  fiscalStartMonth: z.number().min(1).max(12).optional(),
  openingCashBalance: z.number().optional(),
  openingBankBalance: z.number().optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  industry: z.string().optional(),
  currency: z.string().optional(),
  fiscalStartMonth: z.number().min(1).max(12).optional(),
  enableApprovals: z.boolean().optional(),
});

export const transactionSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  vendor: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  vendor: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const categorySchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().optional(),
  parentId: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  parentId: z.string().optional(),
});

export const accountSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['CASH', 'BANK', 'MOBILE_MONEY', 'CREDIT']),
  currency: z.string().default('NGN'),
  openingBalance: z.number().default(0),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const budgetSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Budget amount must be positive'),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  alertThreshold: z.number().min(0).max(100).default(80),
});

export const updateBudgetSchema = z.object({
  amount: z.number().positive().optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const inviteMemberSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'STAFF', 'VIEWER']),
});

export const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'STAFF', 'VIEWER']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;