import { z } from 'zod';

// Auth schemas
export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Business schemas
export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(100),
  industry: z.string().optional(),
  currency: z.string().default('NGN'),
  fiscalStartMonth: z.number().min(1).max(12).default(1),
  openingCashBalance: z.number().min(0).default(0),
  openingBankBalance: z.number().min(0).default(0),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  industry: z.string().optional(),
  currency: z.string().optional(),
  fiscalStartMonth: z.number().min(1).max(12).optional(),
  enableApprovals: z.boolean().optional(),
  budgetAlertThreshold: z.number().min(0).max(100).optional(),
});

// Transaction schemas
export const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.number().positive('Amount must be greater than 0'),
  categoryId: z.string().optional().nullable(),
  accountId: z.string().min(1, 'Account is required'),
  toAccountId: z.string().optional().nullable(), // for transfers
  date: z.string().or(z.date()),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'POS', 'CHEQUE', 'MOBILE_MONEY', 'OTHER']).default('CASH'),
  vendorName: z.string().max(100).optional().nullable(),
  customerName: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  isRecurring: z.boolean().default(false),
  recurringRule: z.string().optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFilterSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  paymentMethod: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
});

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// Budget schemas
export const createBudgetSchema = z.object({
  categoryId: z.string().optional().nullable(),
  amount: z.number().positive('Budget amount must be greater than 0'),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  carryOver: z.boolean().default(false),
});

export const updateBudgetSchema = createBudgetSchema.partial();

// Account schemas
export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(50),
  type: z.enum(['cash', 'bank']).default('bank'),
  openingBalance: z.number().default(0),
});

export const updateAccountSchema = createAccountSchema.partial();

// Transfer schema
export const createTransferSchema = z.object({
  fromAccountId: z.string().min(1, 'Source account is required'),
  toAccountId: z.string().min(1, 'Destination account is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.string().or(z.date()),
  description: z.string().max(500).optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: 'Cannot transfer to the same account',
  path: ['toAccountId'],
});

// Invite schemas
export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'STAFF', 'VIEWER']),
});

// CSV Import schema
export const csvMappingSchema = z.object({
  dateColumn: z.string(),
  amountColumn: z.string(),
  typeColumn: z.string().optional(),
  categoryColumn: z.string().optional(),
  descriptionColumn: z.string().optional(),
  vendorColumn: z.string().optional(),
  paymentMethodColumn: z.string().optional(),
  defaultType: z.enum(['INCOME', 'EXPENSE']).optional(),
  defaultCategoryId: z.string().optional(),
  dateFormat: z.string().default('YYYY-MM-DD'),
});

// Profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Type exports
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CsvMappingInput = z.infer<typeof csvMappingSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
