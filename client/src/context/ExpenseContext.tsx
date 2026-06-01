import React, { createContext, useContext } from 'react';
import { startOfDay, isSameDay, isSameMonth, isSameWeek, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { Expense, InsertExpense, Category as CategoryType } from '@shared/schema';
import { useSettings } from './SettingsContext';

export type Category = string;

interface ExpenseContextType {
  expenses: Expense[];
  categories: string[];
  isLoading: boolean;
  currency: string;
  addExpense: (expense: InsertExpense) => Promise<void>;
  editExpense: (id: string, updates: Partial<InsertExpense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  getDailyTotal: (date?: Date) => number;
  getWeeklyTotal: () => number;
  getMonthlyTotal: (date?: Date) => number;
  getCustomRangeTotal: (startDate: Date, endDate: Date) => number;
  getExpensesByDate: (date: Date) => Expense[];
  getLast6MonthsData: () => { month: string; expenses: number }[];
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { currency } = useSettings();

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: api.fetchExpenses,
  });

  const { data: categoriesData = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: api.fetchCategories,
  });

  const categories = categoriesData.map((cat: CategoryType) => cat.name);

  const createExpenseMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertExpense> }) =>
      api.updateExpense(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: api.deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const getDailyTotal = (date: Date = new Date()) =>
    expenses
      .filter(expense => isSameDay(parseISO(expense.date), date))
      .reduce((sum, expense) => sum + expense.amount, 0);

  const getWeeklyTotal = () => {
    const today = new Date();
    return expenses
      .filter(expense => isSameWeek(parseISO(expense.date), today))
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getMonthlyTotal = (date: Date = new Date()) =>
    expenses
      .filter(expense => isSameMonth(parseISO(expense.date), date))
      .reduce((sum, expense) => sum + expense.amount, 0);

  const getCustomRangeTotal = (startDate: Date, endDate: Date) =>
    expenses
      .filter(expense => {
        const expenseDate = parseISO(expense.date);
        return expenseDate >= startOfDay(startDate) && expenseDate <= endDate;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

  const getExpensesByDate = (date: Date) =>
    expenses.filter(expense => isSameDay(parseISO(expense.date), date));

  const getLast6MonthsData = () => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthExpenses = expenses
        .filter(exp => {
          const date = parseISO(exp.date);
          return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        expenses: monthExpenses,
      });
    }
    return months;
  };

  return (
    <ExpenseContext.Provider value={{
      expenses,
      categories,
      isLoading: expensesLoading || categoriesLoading,
      currency,
      addExpense: (expenseData) => createExpenseMutation.mutateAsync(expenseData),
      editExpense: (id, updates) => updateExpenseMutation.mutateAsync({ id, updates }),
      deleteExpense: (id) => deleteExpenseMutation.mutateAsync(id),
      addCategory: (category) => createCategoryMutation.mutateAsync(category),
      getDailyTotal,
      getWeeklyTotal,
      getMonthlyTotal,
      getCustomRangeTotal,
      getExpensesByDate,
      getLast6MonthsData,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};
