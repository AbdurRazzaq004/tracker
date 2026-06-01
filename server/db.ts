import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { log } from './index';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required. Add it to your .env file.');
}

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'user'], default: 'user' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
});

// Expense Schema
const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'online', 'bank_transfer', 'other'], default: 'cash' },
});

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});
categorySchema.index({ name: 1, userId: 1 }, { unique: true });

// Transaction Schema - for lending/borrowing
const transactionSchema = new mongoose.Schema({
  personName: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['lent', 'borrowed'], required: true },
  status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  date: { type: String, required: true },
  purpose: { type: String, required: true },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

// User Settings Schema
const userSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currency: { type: String, default: 'PKR' },
  defaultMonthlyBudget: { type: Number, default: 30000 },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

// Income Schema
const incomeSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  source: { type: String, enum: ['salary', 'freelance', 'business', 'rental', 'investment', 'other'], required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isRecurring: { type: Boolean, default: false },
  recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringRule', default: null },
});

// Budget Schema
const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryName: { type: String, required: true },
  monthlyLimit: { type: Number, required: true },
  alertThreshold: { type: Number, default: 80 },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});
budgetSchema.index({ userId: 1, categoryName: 1, month: 1, year: 1 }, { unique: true });

// Savings Goal Schema
const savingsGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  targetDate: { type: String },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

// Savings Contribution Schema
const savingsContributionSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsGoal', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  date: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

// Recurring Rule Schema
const recurringRuleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  amount: { type: Number, required: true },
  category: { type: String },
  source: { type: String },
  description: { type: String, required: true },
  paymentMethod: { type: String },
  nextOccurrence: { type: String, required: true },
  endDate: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const UserModel = mongoose.model('User', userSchema);
export const ExpenseModel = mongoose.model('Expense', expenseSchema);
export const CategoryModel = mongoose.model('Category', categorySchema);
export const TransactionModel = mongoose.model('Transaction', transactionSchema);
export const UserSettingsModel = mongoose.model('UserSettings', userSettingsSchema);
export const IncomeModel = mongoose.model('Income', incomeSchema);
export const BudgetModel = mongoose.model('Budget', budgetSchema);
export const SavingsGoalModel = mongoose.model('SavingsGoal', savingsGoalSchema);
export const SavingsContributionModel = mongoose.model('SavingsContribution', savingsContributionSchema);
export const RecurringRuleModel = mongoose.model('RecurringRule', recurringRuleSchema);

// Super Admin credentials
const SUPER_ADMIN_EMAIL = 'abdurrazzaq00000@gmail.com';
const SUPER_ADMIN_PASSWORD = 'razzaq@143@@';
const SUPER_ADMIN_NAME = 'Super Admin';

export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    log('Connected to MongoDB', 'database');

    // Seed super admin if not exists
    const existingAdmin = await UserModel.findOne({ email: SUPER_ADMIN_EMAIL });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
      await UserModel.create({
        email: SUPER_ADMIN_EMAIL,
        passwordHash,
        displayName: SUPER_ADMIN_NAME,
        role: 'super_admin',
        status: 'approved',
        createdAt: new Date().toISOString(),
      });
      log('Super admin account created', 'database');
    } else {
      if (existingAdmin.status !== 'approved' || existingAdmin.role !== 'super_admin') {
        await UserModel.updateOne(
          { email: SUPER_ADMIN_EMAIL },
          { status: 'approved', role: 'super_admin' }
        );
        log('Super admin account updated to approved status', 'database');
      }
    }

    // Seed default categories if none exist
    const globalCategoryCount = await CategoryModel.countDocuments({ userId: null });
    if (globalCategoryCount === 0) {
      const defaultCategories = ['Food', 'Drinks', 'Travel', 'Room', 'Medicine', 'Entertainment', 'Shopping', 'Others'];
      await CategoryModel.insertMany(defaultCategories.map(name => ({ name, userId: null })));
      log('Seeded default global categories', 'database');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
