import {
  type Expense, type InsertExpense,
  type Category, type SafeUser,
  type UserSettings,
  type Income, type InsertIncome,
  type Budget, type InsertBudget, type BudgetStatus,
  type SavingsGoal, type InsertSavingsGoal,
  type SavingsContribution, type InsertContribution,
  type RecurringRule, type InsertRecurringRule,
} from '@shared/schema';

const API_BASE = '/api';

// ── Auth ──
export async function login(email: string, password: string): Promise<{ user: SafeUser }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to login');
  }
  return response.json();
}

export async function register(email: string, password: string, displayName: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to register');
  }
  return response.json();
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to logout');
}

export async function getCurrentUser(): Promise<{ user: SafeUser }> {
  const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (!response.ok) throw new Error('Not authenticated');
  return response.json();
}

// ── Admin ──
export async function getPendingUsers(): Promise<SafeUser[]> {
  const response = await fetch(`${API_BASE}/admin/requests`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch pending users');
  return response.json();
}

export async function approveUser(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/requests/${id}/approve`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to approve user');
}

export async function rejectUser(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/requests/${id}/reject`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to reject user');
}

// ── Expenses ──
export async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetch(`${API_BASE}/expenses`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch expenses');
  return response.json();
}

export async function createExpense(expense: InsertExpense): Promise<Expense> {
  const response = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(expense),
  });
  if (!response.ok) throw new Error('Failed to create expense');
  return response.json();
}

export async function updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense> {
  const response = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update expense');
  return response.json();
}

export async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete expense');
}

// ── Categories ──
export async function fetchCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/categories`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

export async function createCategory(name: string): Promise<Category> {
  const response = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('Failed to create category');
  return response.json();
}

// ── Settings ──
export async function fetchSettings(): Promise<UserSettings> {
  const response = await fetch(`${API_BASE}/settings`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

export async function updateSettings(data: Partial<UserSettings>): Promise<UserSettings> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}

// ── Income ──
export async function fetchIncome(): Promise<Income[]> {
  const response = await fetch(`${API_BASE}/income`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch income');
  return response.json();
}

export async function createIncome(income: InsertIncome): Promise<Income> {
  const response = await fetch(`${API_BASE}/income`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(income),
  });
  if (!response.ok) throw new Error('Failed to create income');
  return response.json();
}

export async function updateIncome(id: string, updates: Partial<InsertIncome>): Promise<Income> {
  const response = await fetch(`${API_BASE}/income/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update income');
  return response.json();
}

export async function deleteIncome(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/income/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete income');
}

// ── Budgets ──
export async function fetchBudgets(): Promise<Budget[]> {
  const response = await fetch(`${API_BASE}/budgets`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch budgets');
  return response.json();
}

export async function fetchBudgetStatus(): Promise<BudgetStatus[]> {
  const response = await fetch(`${API_BASE}/budgets/status`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch budget status');
  return response.json();
}

export async function upsertBudget(budget: InsertBudget): Promise<Budget> {
  const response = await fetch(`${API_BASE}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(budget),
  });
  if (!response.ok) throw new Error('Failed to save budget');
  return response.json();
}

export async function deleteBudget(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/budgets/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete budget');
}

// ── Savings ──
export async function fetchSavingsGoals(): Promise<SavingsGoal[]> {
  const response = await fetch(`${API_BASE}/savings`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch savings goals');
  return response.json();
}

export async function createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal> {
  const response = await fetch(`${API_BASE}/savings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(goal),
  });
  if (!response.ok) throw new Error('Failed to create savings goal');
  return response.json();
}

export async function updateSavingsGoal(id: string, updates: Partial<InsertSavingsGoal>): Promise<SavingsGoal> {
  const response = await fetch(`${API_BASE}/savings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update savings goal');
  return response.json();
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/savings/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete savings goal');
}

export async function fetchContributions(goalId: string): Promise<SavingsContribution[]> {
  const response = await fetch(`${API_BASE}/savings/${goalId}/contributions`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch contributions');
  return response.json();
}

export async function addContribution(goalId: string, data: { amount: number; note?: string; date: string }): Promise<SavingsContribution> {
  const response = await fetch(`${API_BASE}/savings/${goalId}/contributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ ...data, goalId }),
  });
  if (!response.ok) throw new Error('Failed to add contribution');
  return response.json();
}

export async function deleteContribution(goalId: string, contributionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/savings/${goalId}/contributions/${contributionId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete contribution');
}

// ── Recurring ──
export async function fetchRecurringRules(): Promise<RecurringRule[]> {
  const response = await fetch(`${API_BASE}/recurring`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch recurring rules');
  return response.json();
}

export async function createRecurringRule(rule: InsertRecurringRule): Promise<RecurringRule> {
  const response = await fetch(`${API_BASE}/recurring`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(rule),
  });
  if (!response.ok) throw new Error('Failed to create recurring rule');
  return response.json();
}

export async function updateRecurringRule(id: string, updates: { isActive?: boolean; endDate?: string }): Promise<RecurringRule> {
  const response = await fetch(`${API_BASE}/recurring/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update recurring rule');
  return response.json();
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/recurring/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete recurring rule');
}

export async function processRecurringRules(): Promise<void> {
  const response = await fetch(`${API_BASE}/recurring/process`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to process recurring rules');
}
