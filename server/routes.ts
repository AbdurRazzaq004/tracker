import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertExpenseSchema, categorySchema, loginUserSchema, registerUserSchema,
  insertTransactionSchema, UserStatus, UserRole,
  updateSettingsSchema,
  insertIncomeSchema,
  insertBudgetSchema,
  insertSavingsGoalSchema, insertContributionSchema,
  insertRecurringRuleSchema,
} from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import MongoStore from "connect-mongo";
import { log } from "./index";

declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: string;
    status: string;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    log(`Auth failed - no userId in session`, 'auth');
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.session.status !== 'approved') {
    return res.status(403).json({ message: "Account not approved yet" });
  }
  next();
};

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.session.role !== 'super_admin') {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
};

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  let sessionStore: any = undefined;

  if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI) {
    try {
      sessionStore = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 7 * 24 * 60 * 60,
        touchAfter: 24 * 3600,
        autoRemove: 'interval',
        autoRemoveInterval: 10,
      });
      log('MongoDB session store initialized', 'session');
    } catch (error) {
      log(`Failed to initialize MongoDB store: ${error}`, 'session');
      log('Falling back to memory store', 'session');
    }
  }

  const sessionConfig: any = {
    name: 'wealthtracker.sid',
    secret: process.env.SESSION_SECRET || 'mywallet-super-secret-key-2024-change-in-prod',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: sessionStore,
    cookie: {
      path: '/',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
  };

  log(`Session config: secure=${sessionConfig.cookie.secure}, store=${!!sessionStore}`, 'session');
  app.use(session(sessionConfig));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      log(`Request: ${req.method} ${req.path} | SessionID: ${req.sessionID} | UserID: ${req.session?.userId || 'none'}`, 'request');
    }
    next();
  });

  // ============ AUTH ROUTES ============

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const user = await storage.createUser(data.email, data.password, data.displayName || data.email);
      res.status(201).json({
        message: "Registration submitted. Please wait for admin approval.",
        user: { email: user.email, displayName: user.displayName, status: user.status }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginUserSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
      const validPassword = await storage.validatePassword(user, data.password);
      if (!validPassword) return res.status(401).json({ message: "Invalid email or password" });
      if (user.role !== 'super_admin' && user.status !== 'approved') {
        if (user.status === 'pending') return res.status(403).json({ message: "Your account is pending approval. Please wait for admin to approve." });
        if (user.status === 'rejected') return res.status(403).json({ message: "Your account request has been rejected." });
      }
      req.session.userId = user._id;
      req.session.role = user.role;
      req.session.status = user.status;
      req.session.save((err) => {
        if (err) {
          log(`Session save error: ${err}`, 'session');
          return res.status(500).json({ message: "Failed to create session" });
        }
        log(`User logged in: ${user.email}`, 'auth');
        res.json({ user: { _id: user._id, email: user.email, displayName: user.displayName, role: user.role, status: user.status } });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Failed to logout" });
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ user });
  });

  // ============ ADMIN ROUTES ============

  app.get("/api/admin/requests", requireSuperAdmin, async (req, res) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.post("/api/admin/requests/:id/approve", requireSuperAdmin, async (req, res) => {
    try {
      const approved = await storage.approveUser(req.params.id);
      if (!approved) return res.status(404).json({ message: "User not found" });
      res.json({ message: "User approved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  app.post("/api/admin/requests/:id/reject", requireSuperAdmin, async (req, res) => {
    try {
      const rejected = await storage.rejectUser(req.params.id);
      if (!rejected) return res.status(404).json({ message: "User not found" });
      res.json({ message: "User rejected" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reject user" });
    }
  });

  // ============ EXPENSE ROUTES ============

  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses(req.session.userId!);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expense = await storage.getExpenseById(req.params.id, req.session.userId!);
      if (!expense) return res.status(404).json({ message: "Expense not found" });
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData, req.session.userId!);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const allowedUpdates = ['amount', 'category', 'description', 'date', 'paymentMethod'];
      const updates: any = {};
      for (const key of allowedUpdates) {
        if (key in req.body) updates[key] = req.body[key];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      const expense = await storage.updateExpense(req.params.id, req.session.userId!, updates);
      if (!expense) return res.status(404).json({ message: "Expense not found" });
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id, req.session.userId!);
      if (!deleted) return res.status(404).json({ message: "Expense not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // ============ CATEGORY ROUTES ============

  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getAllCategories(req.session.userId!);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const { name } = categorySchema.parse(req.body);
      const category = await storage.createCategory(name, req.session.userId!);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // ============ TRANSACTION ROUTES ============

  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions(req.session.userId!);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(data, req.session.userId!);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const allowedUpdates = ['status', 'personName', 'amount', 'date', 'purpose'];
      const updates: any = {};
      for (const key of allowedUpdates) {
        if (key in req.body) updates[key] = req.body[key];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      const transaction = await storage.updateTransaction(req.params.id, req.session.userId!, updates);
      if (!transaction) return res.status(404).json({ message: "Transaction not found" });
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteTransaction(req.params.id, req.session.userId!);
      if (!deleted) return res.status(404).json({ message: "Transaction not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // ============ SETTINGS ROUTES ============

  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getUserSettings(req.session.userId!);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", requireAuth, async (req, res) => {
    try {
      const data = updateSettingsSchema.parse(req.body);
      const settings = await storage.upsertUserSettings(req.session.userId!, data);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // ============ INCOME ROUTES ============

  app.get("/api/income", requireAuth, async (req, res) => {
    try {
      const income = await storage.getAllIncome(req.session.userId!);
      res.json(income);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch income" });
    }
  });

  app.get("/api/income/:id", requireAuth, async (req, res) => {
    try {
      const income = await storage.getIncomeById(req.params.id, req.session.userId!);
      if (!income) return res.status(404).json({ message: "Income not found" });
      res.json(income);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch income" });
    }
  });

  app.post("/api/income", requireAuth, async (req, res) => {
    try {
      const data = insertIncomeSchema.parse(req.body);
      const income = await storage.createIncome(data, req.session.userId!);
      res.status(201).json(income);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid income data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create income" });
    }
  });

  app.put("/api/income/:id", requireAuth, async (req, res) => {
    try {
      const allowedUpdates = ['amount', 'source', 'description', 'date', 'isRecurring'];
      const updates: any = {};
      for (const key of allowedUpdates) {
        if (key in req.body) updates[key] = req.body[key];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      const income = await storage.updateIncome(req.params.id, req.session.userId!, updates);
      if (!income) return res.status(404).json({ message: "Income not found" });
      res.json(income);
    } catch (error) {
      res.status(500).json({ message: "Failed to update income" });
    }
  });

  app.delete("/api/income/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteIncome(req.params.id, req.session.userId!);
      if (!deleted) return res.status(404).json({ message: "Income not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete income" });
    }
  });

  // ============ BUDGET ROUTES ============

  app.get("/api/budgets", requireAuth, async (req, res) => {
    try {
      const budgets = await storage.getBudgets(req.session.userId!);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  app.get("/api/budgets/status", requireAuth, async (req, res) => {
    try {
      const status = await storage.getBudgetStatus(req.session.userId!);
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budget status" });
    }
  });

  app.post("/api/budgets", requireAuth, async (req, res) => {
    try {
      const data = insertBudgetSchema.parse(req.body);
      const budget = await storage.upsertBudget(req.session.userId!, data);
      res.status(201).json(budget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid budget data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create budget" });
    }
  });

  app.delete("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteBudget(req.params.id, req.session.userId!);
      if (!deleted) return res.status(404).json({ message: "Budget not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  // ============ SAVINGS ROUTES ============

  app.get("/api/savings", requireAuth, async (req, res) => {
    try {
      const goals = await storage.getSavingsGoals(req.session.userId!);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch savings goals" });
    }
  });

  app.post("/api/savings", requireAuth, async (req, res) => {
    try {
      const data = insertSavingsGoalSchema.parse(req.body);
      const goal = await storage.createSavingsGoal(data, req.session.userId!);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create savings goal" });
    }
  });

  app.put("/api/savings/:id", requireAuth, async (req, res) => {
    try {
      const allowedUpdates = ['name', 'targetAmount', 'targetDate', 'description', 'status'];
      const updates: any = {};
      for (const key of allowedUpdates) {
        if (key in req.body) updates[key] = req.body[key];
      }
      const goal = await storage.updateSavingsGoal(req.params.id, req.session.userId!, updates);
      if (!goal) return res.status(404).json({ message: "Goal not found" });
      res.json(goal);
    } catch (error) {
      res.status(500).json({ message: "Failed to update savings goal" });
    }
  });

  app.delete("/api/savings/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteSavingsGoal(req.params.id, req.session.userId!);
      if (!deleted) return res.status(404).json({ message: "Goal not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete savings goal" });
    }
  });

  app.get("/api/savings/:id/contributions", requireAuth, async (req, res) => {
    try {
      const contributions = await storage.getContributions(req.params.id, req.session.userId!);
      res.json(contributions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contributions" });
    }
  });

  app.post("/api/savings/:id/contributions", requireAuth, async (req, res) => {
    try {
      const data = insertContributionSchema.parse({ ...req.body, goalId: req.params.id });
      const contribution = await storage.addContribution(data, req.session.userId!);
      res.status(201).json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contribution data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add contribution" });
    }
  });

  app.delete("/api/savings/:id/contributions/:cid", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteContribution(req.params.cid, req.params.id, req.session.userId!);
      if (!deleted) return res.status(404).json({ message: "Contribution not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contribution" });
    }
  });

  // ============ RECURRING ROUTES ============

  app.get("/api/recurring", requireAuth, async (req, res) => {
    try {
      const rules = await storage.getRecurringRules(req.session.userId!);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recurring rules" });
    }
  });

  app.post("/api/recurring", requireAuth, async (req, res) => {
    try {
      const data = insertRecurringRuleSchema.parse(req.body);
      const rule = await storage.createRecurringRule(data, req.session.userId!);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid recurring rule data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create recurring rule" });
    }
  });

  app.put("/api/recurring/:id", requireAuth, async (req, res) => {
    try {
      const allowedUpdates = ['isActive', 'endDate', 'amount', 'description', 'frequency'];
      const updates: any = {};
      for (const key of allowedUpdates) {
        if (key in req.body) updates[key] = req.body[key];
      }
      const rule = await storage.updateRecurringRule(req.params.id, req.session.userId!, updates);
      if (!rule) return res.status(404).json({ message: "Recurring rule not found" });
      res.json(rule);
    } catch (error) {
      res.status(500).json({ message: "Failed to update recurring rule" });
    }
  });

  app.delete("/api/recurring/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteRecurringRule(req.params.id, req.session.userId!);
      if (!deleted) return res.status(404).json({ message: "Recurring rule not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete recurring rule" });
    }
  });

  app.post("/api/recurring/process", requireAuth, async (req, res) => {
    try {
      await storage.processRecurringRules(req.session.userId!);
      res.json({ message: "Recurring rules processed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process recurring rules" });
    }
  });

  return httpServer;
}
