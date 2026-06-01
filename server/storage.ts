import {
  type Expense, type InsertExpense,
  type Category,
  type User, type SafeUser,
  type Transaction, type InsertTransaction,
  type UserSettings, type InsertUserSettings,
  type Income, type InsertIncome,
  type Budget, type InsertBudget, type BudgetStatus,
  type SavingsGoal, type InsertSavingsGoal,
  type SavingsContribution, type InsertContribution,
  type RecurringRule, type InsertRecurringRule,
  UserRole, UserStatus,
} from "@shared/schema";
import {
  ExpenseModel, CategoryModel, UserModel, TransactionModel,
  UserSettingsModel, IncomeModel, BudgetModel,
  SavingsGoalModel, SavingsContributionModel, RecurringRuleModel,
} from "./db";
import bcrypt from 'bcryptjs';
import { addDays, addWeeks, addMonths, parseISO, formatISO } from 'date-fns';

export interface IStorage {
  // User operations
  getUserById(id: string): Promise<SafeUser | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(email: string, password: string, displayName: string): Promise<SafeUser>;
  getPendingUsers(): Promise<SafeUser[]>;
  approveUser(id: string): Promise<boolean>;
  rejectUser(id: string): Promise<boolean>;
  validatePassword(user: User, password: string): Promise<boolean>;

  // Expense operations
  getAllExpenses(userId: string): Promise<Expense[]>;
  getExpenseById(id: string, userId: string): Promise<Expense | null>;
  createExpense(expense: InsertExpense, userId: string): Promise<Expense>;
  updateExpense(id: string, userId: string, updates: Partial<InsertExpense>): Promise<Expense | null>;
  deleteExpense(id: string, userId: string): Promise<boolean>;

  // Category operations
  getAllCategories(userId: string): Promise<Category[]>;
  createCategory(name: string, userId: string): Promise<Category>;

  // Transaction operations
  getAllTransactions(userId: string): Promise<Transaction[]>;
  getTransactionById(id: string, userId: string): Promise<Transaction | null>;
  createTransaction(transaction: InsertTransaction, userId: string): Promise<Transaction>;
  updateTransaction(id: string, userId: string, updates: Partial<InsertTransaction>): Promise<Transaction | null>;
  deleteTransaction(id: string, userId: string): Promise<boolean>;

  // Settings operations
  getUserSettings(userId: string): Promise<UserSettings>;
  upsertUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;

  // Income operations
  getAllIncome(userId: string): Promise<Income[]>;
  getIncomeById(id: string, userId: string): Promise<Income | null>;
  createIncome(income: InsertIncome, userId: string): Promise<Income>;
  updateIncome(id: string, userId: string, updates: Partial<InsertIncome>): Promise<Income | null>;
  deleteIncome(id: string, userId: string): Promise<boolean>;

  // Budget operations
  getBudgets(userId: string): Promise<Budget[]>;
  upsertBudget(userId: string, budget: InsertBudget): Promise<Budget>;
  deleteBudget(id: string, userId: string): Promise<boolean>;
  getBudgetStatus(userId: string): Promise<BudgetStatus[]>;

  // Savings operations
  getSavingsGoals(userId: string): Promise<SavingsGoal[]>;
  getSavingsGoalById(id: string, userId: string): Promise<SavingsGoal | null>;
  createSavingsGoal(goal: InsertSavingsGoal, userId: string): Promise<SavingsGoal>;
  updateSavingsGoal(id: string, userId: string, updates: Partial<InsertSavingsGoal>): Promise<SavingsGoal | null>;
  deleteSavingsGoal(id: string, userId: string): Promise<boolean>;
  addContribution(contribution: InsertContribution, userId: string): Promise<SavingsContribution>;
  getContributions(goalId: string, userId: string): Promise<SavingsContribution[]>;
  deleteContribution(id: string, goalId: string, userId: string): Promise<boolean>;

  // Recurring operations
  getRecurringRules(userId: string): Promise<RecurringRule[]>;
  createRecurringRule(rule: InsertRecurringRule, userId: string): Promise<RecurringRule>;
  updateRecurringRule(id: string, userId: string, updates: Partial<InsertRecurringRule>): Promise<RecurringRule | null>;
  deleteRecurringRule(id: string, userId: string): Promise<boolean>;
  processRecurringRules(userId: string): Promise<void>;
}

function mapExpense(exp: any): Expense {
  return {
    _id: exp._id.toString(),
    amount: exp.amount,
    category: exp.category,
    description: exp.description,
    date: exp.date,
    createdAt: exp.createdAt,
    userId: exp.userId.toString(),
    paymentMethod: exp.paymentMethod || 'cash',
  };
}

function mapIncome(inc: any): Income {
  return {
    _id: inc._id.toString(),
    amount: inc.amount,
    source: inc.source,
    description: inc.description,
    date: inc.date,
    createdAt: inc.createdAt,
    userId: inc.userId.toString(),
    isRecurring: inc.isRecurring || false,
    recurringId: inc.recurringId ? inc.recurringId.toString() : null,
  };
}

function mapBudget(b: any): Budget {
  return {
    _id: b._id.toString(),
    userId: b.userId.toString(),
    categoryName: b.categoryName,
    monthlyLimit: b.monthlyLimit,
    alertThreshold: b.alertThreshold,
    month: b.month,
    year: b.year,
    createdAt: b.createdAt,
  };
}

function mapSavingsGoal(g: any): SavingsGoal {
  return {
    _id: g._id.toString(),
    userId: g.userId.toString(),
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount || 0,
    targetDate: g.targetDate,
    description: g.description || '',
    status: g.status,
    createdAt: g.createdAt,
  };
}

function mapContribution(c: any): SavingsContribution {
  return {
    _id: c._id.toString(),
    goalId: c.goalId.toString(),
    userId: c.userId.toString(),
    amount: c.amount,
    note: c.note || '',
    date: c.date,
    createdAt: c.createdAt,
  };
}

function mapRecurringRule(r: any): RecurringRule {
  return {
    _id: r._id.toString(),
    userId: r.userId.toString(),
    type: r.type,
    frequency: r.frequency,
    amount: r.amount,
    category: r.category,
    source: r.source,
    description: r.description,
    paymentMethod: r.paymentMethod,
    nextOccurrence: r.nextOccurrence,
    endDate: r.endDate,
    isActive: r.isActive,
    createdAt: r.createdAt,
  };
}

export class MongoStorage implements IStorage {
  // ── User ──
  async getUserById(id: string): Promise<SafeUser | null> {
    const user = await UserModel.findById(id).lean();
    if (!user) return null;
    return {
      _id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role as typeof UserRole[keyof typeof UserRole],
      status: user.status as typeof UserStatus[keyof typeof UserStatus],
      createdAt: user.createdAt,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!user) return null;
    return {
      _id: user._id.toString(),
      email: user.email,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      role: user.role as typeof UserRole[keyof typeof UserRole],
      status: user.status as typeof UserStatus[keyof typeof UserStatus],
      createdAt: user.createdAt,
    };
  }

  async createUser(email: string, password: string, displayName: string): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      role: 'user',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    return {
      _id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role as typeof UserRole[keyof typeof UserRole],
      status: user.status as typeof UserStatus[keyof typeof UserStatus],
      createdAt: user.createdAt,
    };
  }

  async getPendingUsers(): Promise<SafeUser[]> {
    const users = await UserModel.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    return users.map(user => ({
      _id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role as typeof UserRole[keyof typeof UserRole],
      status: user.status as typeof UserStatus[keyof typeof UserStatus],
      createdAt: user.createdAt,
    }));
  }

  async approveUser(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndUpdate(id, { status: 'approved' });
    return result !== null;
  }

  async rejectUser(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndUpdate(id, { status: 'rejected' });
    return result !== null;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  // ── Expenses ──
  async getAllExpenses(userId: string): Promise<Expense[]> {
    const expenses = await ExpenseModel.find({ userId }).sort({ date: -1 }).lean();
    return expenses.map(mapExpense);
  }

  async getExpenseById(id: string, userId: string): Promise<Expense | null> {
    const expense = await ExpenseModel.findOne({ _id: id, userId }).lean();
    if (!expense) return null;
    return mapExpense(expense);
  }

  async createExpense(expenseData: InsertExpense, userId: string): Promise<Expense> {
    const expense = await ExpenseModel.create({
      ...expenseData,
      userId,
      createdAt: new Date().toISOString(),
    });
    return mapExpense(expense.toObject());
  }

  async updateExpense(id: string, userId: string, updates: Partial<InsertExpense>): Promise<Expense | null> {
    const expense = await ExpenseModel.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    ).lean();
    if (!expense) return null;
    return mapExpense(expense);
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    const result = await ExpenseModel.findOneAndDelete({ _id: id, userId });
    return result !== null;
  }

  // ── Categories ──
  async getAllCategories(userId: string): Promise<Category[]> {
    const categories = await CategoryModel.find({
      $or: [{ userId: null }, { userId }]
    }).lean();
    return categories.map(cat => ({
      _id: cat._id.toString(),
      name: cat.name,
      userId: cat.userId ? cat.userId.toString() : null,
    }));
  }

  async createCategory(name: string, userId: string): Promise<Category> {
    const existing = await CategoryModel.findOne({
      name,
      $or: [{ userId: null }, { userId }]
    });
    if (existing) {
      return {
        _id: existing._id.toString(),
        name: existing.name,
        userId: existing.userId ? existing.userId.toString() : null,
      };
    }
    const category = await CategoryModel.create({ name, userId });
    return {
      _id: category._id.toString(),
      name: category.name,
      userId: category.userId ? category.userId.toString() : null,
    };
  }

  // ── Transactions ──
  async getAllTransactions(userId: string): Promise<Transaction[]> {
    const transactions = await TransactionModel.find({ userId }).sort({ date: -1 }).lean();
    return transactions.map(trans => ({
      _id: trans._id.toString(),
      personName: trans.personName,
      amount: trans.amount,
      type: trans.type,
      status: trans.status,
      date: trans.date,
      purpose: trans.purpose,
      createdAt: trans.createdAt,
      userId: trans.userId.toString(),
    }));
  }

  async getTransactionById(id: string, userId: string): Promise<Transaction | null> {
    const transaction = await TransactionModel.findOne({ _id: id, userId }).lean();
    if (!transaction) return null;
    return {
      _id: transaction._id.toString(),
      personName: transaction.personName,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      purpose: transaction.purpose,
      createdAt: transaction.createdAt,
      userId: transaction.userId.toString(),
    };
  }

  async createTransaction(transactionData: InsertTransaction, userId: string): Promise<Transaction> {
    const transaction = await TransactionModel.create({
      ...transactionData,
      userId,
      createdAt: new Date().toISOString(),
    });
    return {
      _id: transaction._id.toString(),
      personName: transaction.personName,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      purpose: transaction.purpose,
      createdAt: transaction.createdAt,
      userId: transaction.userId.toString(),
    };
  }

  async updateTransaction(id: string, userId: string, updates: Partial<InsertTransaction>): Promise<Transaction | null> {
    const transaction = await TransactionModel.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    ).lean();
    if (!transaction) return null;
    return {
      _id: transaction._id.toString(),
      personName: transaction.personName,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      purpose: transaction.purpose,
      createdAt: transaction.createdAt,
      userId: transaction.userId.toString(),
    };
  }

  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const result = await TransactionModel.findOneAndDelete({ _id: id, userId });
    return result !== null;
  }

  // ── Settings ──
  async getUserSettings(userId: string): Promise<UserSettings> {
    const settings = await UserSettingsModel.findOne({ userId }).lean();
    if (!settings) {
      return { _id: '', userId, currency: 'PKR', defaultMonthlyBudget: 30000 };
    }
    return {
      _id: settings._id.toString(),
      userId: settings.userId.toString(),
      currency: settings.currency,
      defaultMonthlyBudget: settings.defaultMonthlyBudget,
    };
  }

  async upsertUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings> {
    const updated = await UserSettingsModel.findOneAndUpdate(
      { userId },
      { ...settings, updatedAt: new Date().toISOString() },
      { new: true, upsert: true }
    ).lean();
    return {
      _id: updated!._id.toString(),
      userId: updated!.userId.toString(),
      currency: updated!.currency,
      defaultMonthlyBudget: updated!.defaultMonthlyBudget,
    };
  }

  // ── Income ──
  async getAllIncome(userId: string): Promise<Income[]> {
    const incomes = await IncomeModel.find({ userId }).sort({ date: -1 }).lean();
    return incomes.map(mapIncome);
  }

  async getIncomeById(id: string, userId: string): Promise<Income | null> {
    const income = await IncomeModel.findOne({ _id: id, userId }).lean();
    if (!income) return null;
    return mapIncome(income);
  }

  async createIncome(incomeData: InsertIncome, userId: string): Promise<Income> {
    const income = await IncomeModel.create({
      ...incomeData,
      userId,
      createdAt: new Date().toISOString(),
    });
    return mapIncome(income.toObject());
  }

  async updateIncome(id: string, userId: string, updates: Partial<InsertIncome>): Promise<Income | null> {
    const income = await IncomeModel.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    ).lean();
    if (!income) return null;
    return mapIncome(income);
  }

  async deleteIncome(id: string, userId: string): Promise<boolean> {
    const result = await IncomeModel.findOneAndDelete({ _id: id, userId });
    return result !== null;
  }

  // ── Budgets ──
  async getBudgets(userId: string): Promise<Budget[]> {
    const budgets = await BudgetModel.find({ userId }).lean();
    return budgets.map(mapBudget);
  }

  async upsertBudget(userId: string, budget: InsertBudget): Promise<Budget> {
    const updated = await BudgetModel.findOneAndUpdate(
      { userId, categoryName: budget.categoryName, month: budget.month, year: budget.year },
      { ...budget, userId, createdAt: new Date().toISOString() },
      { new: true, upsert: true }
    ).lean();
    return mapBudget(updated!);
  }

  async deleteBudget(id: string, userId: string): Promise<boolean> {
    const result = await BudgetModel.findOneAndDelete({ _id: id, userId });
    return result !== null;
  }

  async getBudgetStatus(userId: string): Promise<BudgetStatus[]> {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    // Get all expenses for current month
    const expenses = await ExpenseModel.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth + 'T23:59:59.999Z' },
    }).lean();

    // Aggregate by category
    const spentByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      spentByCategory[exp.category] = (spentByCategory[exp.category] || 0) + exp.amount;
    }

    // Get budgets: specific month/year first, fall back to standing (-1/-1)
    const specificBudgets = await BudgetModel.find({ userId, month, year }).lean();
    const standingBudgets = await BudgetModel.find({ userId, month: -1, year: -1 }).lean();

    // Merge: specific overrides standing
    const budgetMap: Record<string, any> = {};
    for (const b of standingBudgets) budgetMap[b.categoryName] = b;
    for (const b of specificBudgets) budgetMap[b.categoryName] = b;

    return Object.values(budgetMap).map(b => {
      const spent = spentByCategory[b.categoryName] || 0;
      const percentage = Math.round((spent / b.monthlyLimit) * 100);
      return {
        categoryName: b.categoryName,
        limit: b.monthlyLimit,
        spent,
        percentage,
        isOver: spent > b.monthlyLimit,
        isNearLimit: percentage >= b.alertThreshold && spent <= b.monthlyLimit,
        alertThreshold: b.alertThreshold,
      };
    });
  }

  // ── Savings Goals ──
  async getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
    const goals = await SavingsGoalModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return goals.map(mapSavingsGoal);
  }

  async getSavingsGoalById(id: string, userId: string): Promise<SavingsGoal | null> {
    const goal = await SavingsGoalModel.findOne({ _id: id, userId }).lean();
    if (!goal) return null;
    return mapSavingsGoal(goal);
  }

  async createSavingsGoal(goal: InsertSavingsGoal, userId: string): Promise<SavingsGoal> {
    const created = await SavingsGoalModel.create({
      ...goal,
      userId,
      currentAmount: 0,
      createdAt: new Date().toISOString(),
    });
    return mapSavingsGoal(created.toObject());
  }

  async updateSavingsGoal(id: string, userId: string, updates: Partial<InsertSavingsGoal>): Promise<SavingsGoal | null> {
    const goal = await SavingsGoalModel.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    ).lean();
    if (!goal) return null;
    return mapSavingsGoal(goal);
  }

  async deleteSavingsGoal(id: string, userId: string): Promise<boolean> {
    const result = await SavingsGoalModel.findOneAndDelete({ _id: id, userId });
    if (!result) return false;
    await SavingsContributionModel.deleteMany({ goalId: id });
    return true;
  }

  async addContribution(contribution: InsertContribution, userId: string): Promise<SavingsContribution> {
    const created = await SavingsContributionModel.create({
      ...contribution,
      userId,
      createdAt: new Date().toISOString(),
    });
    await SavingsGoalModel.findByIdAndUpdate(contribution.goalId, {
      $inc: { currentAmount: contribution.amount },
    });
    // Mark as completed if target reached
    const goal = await SavingsGoalModel.findById(contribution.goalId).lean();
    if (goal && goal.currentAmount >= goal.targetAmount) {
      await SavingsGoalModel.findByIdAndUpdate(contribution.goalId, { status: 'completed' });
    }
    return mapContribution(created.toObject());
  }

  async getContributions(goalId: string, userId: string): Promise<SavingsContribution[]> {
    const contributions = await SavingsContributionModel.find({ goalId, userId }).sort({ date: -1 }).lean();
    return contributions.map(mapContribution);
  }

  async deleteContribution(id: string, goalId: string, userId: string): Promise<boolean> {
    const contribution = await SavingsContributionModel.findOne({ _id: id, goalId, userId }).lean();
    if (!contribution) return false;
    await SavingsContributionModel.findByIdAndDelete(id);
    await SavingsGoalModel.findByIdAndUpdate(goalId, {
      $inc: { currentAmount: -contribution.amount },
    });
    // Revert completed status if needed
    const goal = await SavingsGoalModel.findById(goalId).lean();
    if (goal && goal.status === 'completed' && goal.currentAmount < goal.targetAmount) {
      await SavingsGoalModel.findByIdAndUpdate(goalId, { status: 'active' });
    }
    return true;
  }

  // ── Recurring Rules ──
  async getRecurringRules(userId: string): Promise<RecurringRule[]> {
    const rules = await RecurringRuleModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return rules.map(mapRecurringRule);
  }

  async createRecurringRule(ruleData: InsertRecurringRule, userId: string): Promise<RecurringRule> {
    const { startDate, ...rest } = ruleData;
    const rule = await RecurringRuleModel.create({
      ...rest,
      userId,
      nextOccurrence: startDate,
      createdAt: new Date().toISOString(),
    });
    return mapRecurringRule(rule.toObject());
  }

  async updateRecurringRule(id: string, userId: string, updates: Partial<InsertRecurringRule>): Promise<RecurringRule | null> {
    const rule = await RecurringRuleModel.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    ).lean();
    if (!rule) return null;
    return mapRecurringRule(rule);
  }

  async deleteRecurringRule(id: string, userId: string): Promise<boolean> {
    const result = await RecurringRuleModel.findOneAndDelete({ _id: id, userId });
    return result !== null;
  }

  async processRecurringRules(userId: string): Promise<void> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const dueRules = await RecurringRuleModel.find({
      userId,
      isActive: true,
      nextOccurrence: { $lte: todayStr + 'T23:59:59.999Z' },
    }).lean();

    for (const rule of dueRules) {
      // Check end date
      if (rule.endDate && rule.nextOccurrence > rule.endDate) {
        await RecurringRuleModel.findByIdAndUpdate(rule._id, { isActive: false });
        continue;
      }

      // Create expense or income
      if (rule.type === 'expense') {
        await ExpenseModel.create({
          amount: rule.amount,
          category: rule.category || 'Others',
          description: rule.description,
          date: rule.nextOccurrence,
          paymentMethod: rule.paymentMethod || 'cash',
          userId,
          isRecurring: true,
          recurringId: rule._id,
          createdAt: new Date().toISOString(),
        });
      } else {
        await IncomeModel.create({
          amount: rule.amount,
          source: rule.source || 'other',
          description: rule.description,
          date: rule.nextOccurrence,
          userId,
          isRecurring: true,
          recurringId: rule._id,
          createdAt: new Date().toISOString(),
        });
      }

      // Calculate next occurrence
      const current = parseISO(rule.nextOccurrence);
      let next: Date;
      if (rule.frequency === 'daily') next = addDays(current, 1);
      else if (rule.frequency === 'weekly') next = addWeeks(current, 1);
      else next = addMonths(current, 1);

      await RecurringRuleModel.findByIdAndUpdate(rule._id, {
        nextOccurrence: formatISO(next, { representation: 'date' }),
      });
    }
  }
}

export const storage = new MongoStorage();
