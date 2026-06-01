import { z } from "zod";

// User roles and status
export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  USER: 'user',
} as const;

export const UserStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// User Schema
export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
});

export const registerUserSchema = userSchema.extend({
  displayName: z.string().min(1, "Display name is required"),
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type User = {
  _id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: typeof UserRole[keyof typeof UserRole];
  status: typeof UserStatus[keyof typeof UserStatus];
  createdAt: string;
};

export type SafeUser = Omit<User, 'passwordHash'>;

export type InsertUser = z.infer<typeof registerUserSchema>;

// Payment Methods
export const PaymentMethod = {
  CASH: 'cash',
  CARD: 'card',
  ONLINE: 'online',
  BANK_TRANSFER: 'bank_transfer',
  OTHER: 'other',
} as const;

// Expense Schema for MongoDB
export const expenseSchema = z.object({
  amount: z.number().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  date: z.string(),
  createdAt: z.string(),
  userId: z.string(),
  paymentMethod: z.enum(['cash', 'card', 'online', 'bank_transfer', 'other']).default('cash'),
});

export const insertExpenseSchema = expenseSchema.omit({ createdAt: true, userId: true });

export type Expense = z.infer<typeof expenseSchema> & { _id: string };
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Category Schema
export const categorySchema = z.object({
  name: z.string().min(1),
  userId: z.string().optional(),
});

export type Category = {
  _id: string;
  name: string;
  userId: string | null;
};

// Transaction Type
export const TransactionType = {
  LENT: 'lent',
  BORROWED: 'borrowed',
} as const;

export const TransactionStatus = {
  PAID: 'paid',
  UNPAID: 'unpaid',
} as const;

// Lending/Borrowing Transaction Schema
export const transactionSchema = z.object({
  personName: z.string().min(1, "Person's name is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  type: z.enum(['lent', 'borrowed']),
  status: z.enum(['paid', 'unpaid']),
  date: z.string(),
  purpose: z.string().min(1, "Purpose is required"),
  createdAt: z.string(),
  userId: z.string(),
});

export const insertTransactionSchema = transactionSchema.omit({ createdAt: true, userId: true });

export type Transaction = z.infer<typeof transactionSchema> & { _id: string };
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// User Settings Schema
export const userSettingsSchema = z.object({
  currency: z.string().min(1).default('PKR'),
  defaultMonthlyBudget: z.number().min(0).default(30000),
  displayName: z.string().min(1).optional(),
});

export const updateSettingsSchema = userSettingsSchema.partial();

export type UserSettings = {
  _id: string;
  userId: string;
  currency: string;
  defaultMonthlyBudget: number;
};

export type InsertUserSettings = z.infer<typeof userSettingsSchema>;

// Income Sources
export const IncomeSource = {
  SALARY: 'salary',
  FREELANCE: 'freelance',
  BUSINESS: 'business',
  RENTAL: 'rental',
  INVESTMENT: 'investment',
  OTHER: 'other',
} as const;

// Income Schema
export const incomeItemSchema = z.object({
  amount: z.number().min(1),
  source: z.enum(['salary', 'freelance', 'business', 'rental', 'investment', 'other']),
  description: z.string().min(1),
  date: z.string(),
  createdAt: z.string(),
  userId: z.string(),
  isRecurring: z.boolean().default(false),
  recurringId: z.string().nullable().optional(),
});

export const insertIncomeSchema = incomeItemSchema.omit({ createdAt: true, userId: true, recurringId: true });

export type Income = z.infer<typeof incomeItemSchema> & { _id: string };
export type InsertIncome = z.infer<typeof insertIncomeSchema>;

// Budget Schema
export const budgetItemSchema = z.object({
  userId: z.string(),
  categoryName: z.string().min(1),
  monthlyLimit: z.number().min(1),
  alertThreshold: z.number().min(1).max(100).default(80),
  month: z.number().min(-1).max(11),
  year: z.number(),
  createdAt: z.string(),
});

export const insertBudgetSchema = budgetItemSchema.omit({ userId: true, createdAt: true });

export type Budget = z.infer<typeof budgetItemSchema> & { _id: string };
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

export type BudgetStatus = {
  categoryName: string;
  limit: number;
  spent: number;
  percentage: number;
  isOver: boolean;
  isNearLimit: boolean;
  alertThreshold: number;
};

// Savings Goal Schema
export const savingsGoalSchema = z.object({
  userId: z.string(),
  name: z.string().min(1),
  targetAmount: z.number().min(1),
  currentAmount: z.number().default(0),
  targetDate: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused']).default('active'),
  createdAt: z.string(),
});

export const insertSavingsGoalSchema = savingsGoalSchema.omit({ userId: true, currentAmount: true, createdAt: true });

export type SavingsGoal = z.infer<typeof savingsGoalSchema> & { _id: string };
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;

// Savings Contribution Schema
export const savingsContributionSchema = z.object({
  goalId: z.string(),
  userId: z.string(),
  amount: z.number().min(1),
  note: z.string().optional(),
  date: z.string(),
  createdAt: z.string(),
});

export const insertContributionSchema = savingsContributionSchema.omit({ userId: true, createdAt: true });

export type SavingsContribution = z.infer<typeof savingsContributionSchema> & { _id: string };
export type InsertContribution = z.infer<typeof insertContributionSchema>;

// Recurring Rule Schema
export const recurringRuleSchema = z.object({
  userId: z.string(),
  type: z.enum(['expense', 'income']),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  amount: z.number().min(1),
  category: z.string().optional(),
  source: z.string().optional(),
  description: z.string().min(1),
  paymentMethod: z.string().optional(),
  nextOccurrence: z.string(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
});

export const insertRecurringRuleSchema = recurringRuleSchema.omit({ userId: true, createdAt: true, nextOccurrence: true }).extend({
  startDate: z.string(),
});

export type RecurringRule = z.infer<typeof recurringRuleSchema> & { _id: string };
export type InsertRecurringRule = z.infer<typeof insertRecurringRuleSchema>;
